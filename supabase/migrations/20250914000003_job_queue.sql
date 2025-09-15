-- Create job_queue table for scalable task processing
CREATE TABLE IF NOT EXISTS job_queue (
    id VARCHAR(100) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_queue_user_id ON job_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled_for ON job_queue(scheduled_for);

-- Composite index for job processing
CREATE INDEX IF NOT EXISTS idx_job_queue_processing ON job_queue(job_type, status, priority DESC, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_queue
-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON job_queue
    FOR SELECT USING (auth.uid()::bigint = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can create own jobs" ON job_queue
    FOR INSERT WITH CHECK (auth.uid()::bigint = user_id);

-- Users can update their own jobs (for cancellation)
CREATE POLICY "Users can update own jobs" ON job_queue
    FOR UPDATE USING (auth.uid()::bigint = user_id);

-- System can process any job (for queue workers)
CREATE POLICY "System can process jobs" ON job_queue
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- No deletes allowed (jobs are historical records)
CREATE POLICY "No deletes on jobs" ON job_queue
    FOR DELETE USING (false);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS job_queue_updated_at_trigger ON job_queue;
CREATE TRIGGER job_queue_updated_at_trigger
    BEFORE UPDATE ON job_queue
    FOR EACH ROW EXECUTE FUNCTION update_job_updated_at();

-- Create function to get next job for processing (with user isolation)
CREATE OR REPLACE FUNCTION get_next_job(job_type_filter VARCHAR(50))
RETURNS SETOF job_queue AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM job_queue
    WHERE job_type = job_type_filter
    AND status = 'pending'
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    ORDER BY 
        CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user job statistics
CREATE OR REPLACE FUNCTION get_user_job_stats(target_user_id BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Ensure user can only get their own stats
    IF auth.uid()::bigint != target_user_id THEN
        RAISE EXCEPTION 'Access denied: Can only view your own job statistics';
    END IF;

    SELECT json_build_object(
        'user_id', target_user_id,
        'total_jobs', COUNT(*),
        'status_breakdown', json_object_agg(status, status_count),
        'type_breakdown', json_object_agg(job_type, type_count),
        'recent_jobs', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'job_type', job_type,
                    'status', status,
                    'created_at', created_at
                )
            )
            FROM (
                SELECT id, job_type, status, created_at
                FROM job_queue
                WHERE user_id = target_user_id
                ORDER BY created_at DESC
                LIMIT 10
            ) recent
        )
    ) INTO result
    FROM (
        SELECT 
            status,
            job_type,
            COUNT(*) OVER (PARTITION BY status) as status_count,
            COUNT(*) OVER (PARTITION BY job_type) as type_count
        FROM job_queue 
        WHERE user_id = target_user_id
    ) stats_data;

    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old completed jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed/failed jobs older than retention period
    DELETE FROM job_queue 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND updated_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (
        0, -- System user
        'job_cleanup',
        'system',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', retention_days,
            'user_scoped', false
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_jobs(max_age_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Reset failed jobs that are not too old and haven't exceeded max attempts
    UPDATE job_queue 
    SET 
        status = 'pending',
        attempts = 0,
        error_message = NULL,
        updated_at = NOW(),
        scheduled_for = NOW() + INTERVAL '5 minutes'
    WHERE status = 'failed'
    AND attempts < max_attempts
    AND updated_at > NOW() - (max_age_hours || ' hours')::INTERVAL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the retry operation
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (
        0, -- System user
        'job_retry_batch',
        'system',
        jsonb_build_object(
            'retried_count', updated_count,
            'max_age_hours', max_age_hours,
            'user_scoped', false
        )
    );
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON job_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_job(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_job_stats(BIGINT) TO authenticated;
