-- Create user_kyc table for KYC/identity verification data
CREATE TABLE IF NOT EXISTS user_kyc (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    verification_level VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (verification_level IN ('none', 'basic', 'enhanced', 'full')),
    document_type VARCHAR(50),
    document_number VARCHAR(100),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'expired')),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    verification_provider VARCHAR(50),
    risk_score INTEGER DEFAULT 0,
    compliance_flags JSONB DEFAULT '[]'::jsonb,
    additional_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create compliance_checks table for tracking compliance rule evaluations
CREATE TABLE IF NOT EXISTS compliance_checks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
    message TEXT NOT NULL,
    action_taken VARCHAR(20) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create compliance_rules table for storing dynamic compliance rules
CREATE TABLE IF NOT EXISTS compliance_rules (
    id VARCHAR(100) PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'warn', 'block', 'review')),
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_kyc_user_id ON user_kyc(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kyc_verification_level ON user_kyc(verification_level);
CREATE INDEX IF NOT EXISTS idx_user_kyc_verification_status ON user_kyc(verification_status);
CREATE INDEX IF NOT EXISTS idx_user_kyc_expires_at ON user_kyc(expires_at);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_id ON compliance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_rule_id ON compliance_checks(rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_checked_at ON compliance_checks(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_rule_type ON compliance_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_is_active ON compliance_rules(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE user_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_kyc
-- Users can only see their own KYC data
CREATE POLICY "Users can view own KYC data" ON user_kyc
    FOR SELECT USING (auth.uid()::bigint = user_id);

-- Users can insert/update their own KYC data
CREATE POLICY "Users can manage own KYC data" ON user_kyc
    FOR INSERT WITH CHECK (auth.uid()::bigint = user_id);

CREATE POLICY "Users can update own KYC data" ON user_kyc
    FOR UPDATE USING (auth.uid()::bigint = user_id);

-- No deletes allowed on KYC data (compliance requirement)
CREATE POLICY "No deletes on KYC data" ON user_kyc
    FOR DELETE USING (false);

-- RLS Policies for compliance_checks
-- Users can only see their own compliance checks
CREATE POLICY "Users can view own compliance checks" ON compliance_checks
    FOR SELECT USING (auth.uid()::bigint = user_id);

-- System can insert compliance checks
CREATE POLICY "System can insert compliance checks" ON compliance_checks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes on compliance checks (audit trail)
CREATE POLICY "No updates on compliance checks" ON compliance_checks
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on compliance checks" ON compliance_checks
    FOR DELETE USING (false);

-- RLS Policies for compliance_rules
-- All authenticated users can read active compliance rules
CREATE POLICY "Users can view active compliance rules" ON compliance_rules
    FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Only system can manage compliance rules
CREATE POLICY "System can manage compliance rules" ON compliance_rules
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS user_kyc_updated_at_trigger ON user_kyc;
CREATE TRIGGER user_kyc_updated_at_trigger
    BEFORE UPDATE ON user_kyc
    FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS compliance_rules_updated_at_trigger ON compliance_rules;
CREATE TRIGGER compliance_rules_updated_at_trigger
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- Create function to check KYC expiration
CREATE OR REPLACE FUNCTION check_kyc_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration date based on verification level
    IF NEW.verification_level = 'basic' THEN
        NEW.expires_at = NOW() + INTERVAL '2 years';
    ELSIF NEW.verification_level = 'enhanced' THEN
        NEW.expires_at = NOW() + INTERVAL '3 years';
    ELSIF NEW.verification_level = 'full' THEN
        NEW.expires_at = NOW() + INTERVAL '5 years';
    END IF;

    -- Set verified_at timestamp when status changes to approved
    IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
        NEW.verified_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for KYC expiration handling
DROP TRIGGER IF EXISTS kyc_expiration_trigger ON user_kyc;
CREATE TRIGGER kyc_expiration_trigger
    BEFORE INSERT OR UPDATE ON user_kyc
    FOR EACH ROW EXECUTE FUNCTION check_kyc_expiration();

-- Create function to get user compliance status
CREATE OR REPLACE FUNCTION get_user_compliance_status(target_user_id BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    kyc_data RECORD;
    recent_checks INTEGER;
    failed_checks INTEGER;
BEGIN
    -- Ensure user can only get their own compliance status
    IF auth.uid()::bigint != target_user_id THEN
        RAISE EXCEPTION 'Access denied: Can only view your own compliance status';
    END IF;

    -- Get KYC data
    SELECT * INTO kyc_data FROM user_kyc WHERE user_id = target_user_id;

    -- Get recent compliance check counts
    SELECT COUNT(*) INTO recent_checks
    FROM compliance_checks 
    WHERE user_id = target_user_id 
    AND checked_at >= NOW() - INTERVAL '30 days';

    SELECT COUNT(*) INTO failed_checks
    FROM compliance_checks 
    WHERE user_id = target_user_id 
    AND status = 'failed'
    AND checked_at >= NOW() - INTERVAL '30 days';

    -- Build result
    SELECT json_build_object(
        'user_id', target_user_id,
        'kyc_status', COALESCE(kyc_data.verification_status, 'none'),
        'verification_level', COALESCE(kyc_data.verification_level, 'none'),
        'kyc_expires_at', kyc_data.expires_at,
        'risk_score', COALESCE(kyc_data.risk_score, 0),
        'compliance_flags', COALESCE(kyc_data.compliance_flags, '[]'::jsonb),
        'recent_checks', recent_checks,
        'failed_checks', failed_checks,
        'compliance_score', CASE 
            WHEN failed_checks = 0 AND kyc_data.verification_level IN ('enhanced', 'full') THEN 'excellent'
            WHEN failed_checks <= 2 AND kyc_data.verification_level = 'basic' THEN 'good'
            WHEN failed_checks <= 5 THEN 'fair'
            ELSE 'poor'
        END
    ) INTO result;

    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check transaction limits based on KYC level
CREATE OR REPLACE FUNCTION check_transaction_limit(
    target_user_id BIGINT,
    transaction_amount DECIMAL,
    transaction_type VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
    kyc_level VARCHAR(20);
    daily_limit DECIMAL;
    daily_total DECIMAL;
    result JSON;
BEGIN
    -- Get user's KYC level
    SELECT verification_level INTO kyc_level 
    FROM user_kyc 
    WHERE user_id = target_user_id;

    -- Set daily limits based on KYC level
    CASE COALESCE(kyc_level, 'none')
        WHEN 'none' THEN daily_limit := 100;
        WHEN 'basic' THEN daily_limit := 1000;
        WHEN 'enhanced' THEN daily_limit := 10000;
        WHEN 'full' THEN daily_limit := 100000;
        ELSE daily_limit := 100;
    END CASE;

    -- Calculate today's transaction total
    SELECT COALESCE(SUM(amount::decimal), 0) INTO daily_total
    FROM wallet_transactions
    WHERE user_id = target_user_id
    AND transaction_type = 'withdrawal'
    AND DATE(created_at) = CURRENT_DATE;

    -- Build result
    SELECT json_build_object(
        'allowed', (daily_total + transaction_amount) <= daily_limit,
        'daily_limit', daily_limit,
        'daily_used', daily_total,
        'daily_remaining', daily_limit - daily_total,
        'transaction_amount', transaction_amount,
        'kyc_level', COALESCE(kyc_level, 'none'),
        'upgrade_required', CASE 
            WHEN (daily_total + transaction_amount) > daily_limit THEN true 
            ELSE false 
        END
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default compliance rules
INSERT INTO compliance_rules (id, rule_type, description, severity, action, conditions, message) VALUES
('kyc_required', 'kyc_verification', 'KYC verification required for wallet operations', 'warning', 'warn', 
 '{"min_verification_level": "basic"}'::jsonb, 
 'Please complete identity verification to access full wallet features.'),

('transaction_limit', 'transaction_limits', 'Daily transaction limits based on verification level', 'error', 'block',
 '{"unverified_daily_limit": 100, "basic_daily_limit": 1000, "enhanced_daily_limit": 10000, "full_daily_limit": 100000}'::jsonb,
 'Transaction limit exceeded. Please verify your identity to increase limits.'),

('suspicious_activity', 'aml_monitoring', 'Monitor for suspicious transaction patterns', 'critical', 'review',
 '{"rapid_transactions": 10, "large_amount_threshold": 5000}'::jsonb,
 'Account flagged for review due to unusual activity patterns.'),

('age_verification', 'age_check', 'Minimum age requirement for crypto services', 'error', 'block',
 '{"min_age": 18}'::jsonb,
 'You must be at least 18 years old to use cryptocurrency services.')

ON CONFLICT (id) DO NOTHING;

-- Create function to expire old KYC verifications
CREATE OR REPLACE FUNCTION expire_old_kyc_verifications()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Mark expired KYC verifications
    UPDATE user_kyc 
    SET 
        verification_status = 'expired',
        updated_at = NOW()
    WHERE verification_status = 'approved'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the expiration operation
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (
        0, -- System user
        'kyc_expiration_batch',
        'system',
        jsonb_build_object(
            'expired_count', updated_count,
            'user_scoped', false
        )
    );
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_kyc TO authenticated;
GRANT SELECT, INSERT ON compliance_checks TO authenticated;
GRANT SELECT ON compliance_rules TO authenticated;
GRANT USAGE ON SEQUENCE user_kyc_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE compliance_checks_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_compliance_status(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_transaction_limit(BIGINT, DECIMAL, VARCHAR) TO authenticated;
