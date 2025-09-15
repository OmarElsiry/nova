-- Create audit_logs table for tracking all user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create security_logs table for security violations
CREATE TABLE IF NOT EXISTS security_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_violation_type ON security_logs(violation_type);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid()::bigint = user_id);

-- Only authenticated users can insert audit logs (system function)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes allowed on audit logs (immutable)
CREATE POLICY "No updates on audit logs" ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on audit logs" ON audit_logs
    FOR DELETE USING (false);

-- RLS Policies for security_logs
-- Users can only see their own security logs
CREATE POLICY "Users can view own security logs" ON security_logs
    FOR SELECT USING (auth.uid()::bigint = user_id);

-- Only system can insert security logs
CREATE POLICY "System can insert security logs" ON security_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes allowed on security logs (immutable)
CREATE POLICY "No updates on security logs" ON security_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on security logs" ON security_logs
    FOR DELETE USING (false);

-- Create function to automatically log wallet operations
CREATE OR REPLACE FUNCTION log_wallet_operation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log wallet creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
            NEW.user_id,
            'wallet_created',
            'wallet',
            NEW.wallet_address,
            jsonb_build_object(
                'wallet_id', NEW.id,
                'wallet_type', NEW.wallet_type,
                'user_scoped', true
            )
        );
        RETURN NEW;
    END IF;

    -- Log wallet updates
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
            NEW.user_id,
            'wallet_updated',
            'wallet',
            NEW.wallet_address,
            jsonb_build_object(
                'wallet_id', NEW.id,
                'changes', jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status
                ),
                'user_scoped', true
            )
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically log transaction operations
CREATE OR REPLACE FUNCTION log_transaction_operation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log transaction creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.transaction_type = 'deposit' THEN 'transaction_deposit'
                WHEN NEW.transaction_type = 'withdrawal' THEN 'transaction_withdrawal'
                ELSE 'transaction_created'
            END,
            'transaction',
            NEW.transaction_hash,
            jsonb_build_object(
                'amount', NEW.amount,
                'transaction_type', NEW.transaction_type,
                'status', NEW.status,
                'user_scoped', true
            )
        );
        RETURN NEW;
    END IF;

    -- Log transaction status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
            NEW.user_id,
            'transaction_status_updated',
            'transaction',
            NEW.transaction_hash,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'amount', NEW.amount,
                'user_scoped', true
            )
        );
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic logging
DROP TRIGGER IF EXISTS wallet_audit_trigger ON user_wallets;
CREATE TRIGGER wallet_audit_trigger
    AFTER INSERT OR UPDATE ON user_wallets
    FOR EACH ROW EXECUTE FUNCTION log_wallet_operation();

DROP TRIGGER IF EXISTS transaction_audit_trigger ON wallet_transactions;
CREATE TRIGGER transaction_audit_trigger
    AFTER INSERT OR UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION log_transaction_operation();

-- Create function to clean up old audit logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than retention period
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (
        0, -- System user
        'audit_cleanup',
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

-- Create function to get user audit summary
CREATE OR REPLACE FUNCTION get_user_audit_summary(target_user_id BIGINT, days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Ensure user can only get their own summary
    IF auth.uid()::bigint != target_user_id THEN
        RAISE EXCEPTION 'Access denied: Can only view your own audit summary';
    END IF;

    SELECT json_build_object(
        'user_id', target_user_id,
        'period_days', days,
        'total_actions', COUNT(*),
        'action_breakdown', json_object_agg(action, action_count),
        'resource_breakdown', json_object_agg(resource_type, resource_count),
        'last_activity', MAX(timestamp)
    ) INTO result
    FROM (
        SELECT 
            action,
            resource_type,
            timestamp,
            COUNT(*) OVER (PARTITION BY action) as action_count,
            COUNT(*) OVER (PARTITION BY resource_type) as resource_count
        FROM audit_logs 
        WHERE user_id = target_user_id 
        AND timestamp >= NOW() - (days || ' days')::INTERVAL
    ) summary_data;

    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT ON security_logs TO authenticated;
GRANT USAGE ON SEQUENCE audit_logs_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE security_logs_id_seq TO authenticated;
