-- supabase/seed.sql
-- Initial database setup for Uzumaki Investments

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'investment', 'earning', 'bonus', 'referral', 'penalty');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'expired');
CREATE TYPE investment_status AS ENUM ('active', 'completed', 'cancelled', 'paused');
CREATE TYPE payment_method AS ENUM ('Pay0', 'UPI', 'bank_transfer', 'wallet', 'crypto');
CREATE TYPE plan_type AS ENUM ('basic', 'premium', 'vip', 'custom');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'system');

-- Create tables

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    country TEXT DEFAULT 'India',
    city TEXT,
    address TEXT,
    date_of_birth DATE,
    
    -- Account status
    status user_status DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_vip BOOLEAN DEFAULT FALSE,
    
    -- Financial info
    wallet_balance DECIMAL(15,2) DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    
    -- Referral system
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES profiles(id),
    referral_count INTEGER DEFAULT 0,
    referral_earnings DECIMAL(15,2) DEFAULT 0,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_wallet_balance CHECK (wallet_balance >= 0),
    CONSTRAINT valid_total_invested CHECK (total_invested >= 0),
    CONSTRAINT valid_total_earned CHECK (total_earned >= 0)
);

-- Investment plans
CREATE TABLE IF NOT EXISTS investment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type plan_type NOT NULL,
    
    -- Investment details
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    duration_days INTEGER NOT NULL,
    daily_profit_percentage DECIMAL(5,2) NOT NULL,
    total_profit_percentage DECIMAL(5,2) NOT NULL,
    
    -- Features
    allows_compound BOOLEAN DEFAULT FALSE,
    allows_withdrawal BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- VIP features
    vip_only BOOLEAN DEFAULT FALSE,
    min_vip_level INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (min_amount > 0 AND (max_amount IS NULL OR max_amount >= min_amount)),
    CONSTRAINT valid_percentages CHECK (daily_profit_percentage > 0 AND total_profit_percentage > 0)
);

-- User investments
CREATE TABLE IF NOT EXISTS user_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES investment_plans(id),
    
    -- Investment details
    amount DECIMAL(15,2) NOT NULL,
    status investment_status DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    expected_profit DECIMAL(15,2),
    actual_profit DECIMAL(15,2) DEFAULT 0,
    
    -- Settings
    is_compound BOOLEAN DEFAULT FALSE,
    auto_renew BOOLEAN DEFAULT FALSE,
    
    -- Progress tracking
    days_completed INTEGER DEFAULT 0,
    last_profit_date TIMESTAMP WITH TIME ZONE,
    next_profit_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction details
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    description TEXT,
    
    -- Payment details
    payment_method payment_method,
    payment_details JSONB,
    payment_proof_url TEXT,
    transaction_id TEXT UNIQUE,
    utr_number TEXT,
    
    -- Wallet impact
    wallet_balance_before DECIMAL(15,2),
    wallet_balance_after DECIMAL(15,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id),
    
    -- Indexes
    CONSTRAINT valid_amount_transaction CHECK (amount > 0)
);

-- Daily earnings
CREATE TABLE IF NOT EXISTS daily_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    investment_id UUID REFERENCES user_investments(id) ON DELETE CASCADE,
    
    -- Earning details
    amount DECIMAL(15,2) NOT NULL,
    earning_date DATE NOT NULL,
    type transaction_type DEFAULT 'earning',
    description TEXT,
    
    -- Status
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_earning_amount CHECK (amount > 0)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Commission details
    commission_percentage DECIMAL(5,2) DEFAULT 10.00,
    commission_amount DECIMAL(15,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    has_earned BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_investment_date TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(referrer_id, referred_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification details
    type notification_type DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiry
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User info
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    
    -- Action details
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    page_url TEXT,
    referrer TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Error details
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    
    -- User context
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    page_url TEXT,
    
    -- Technical context
    browser_info JSONB,
    screen_info JSONB,
    metadata JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin action logs
CREATE TABLE IF NOT EXISTS admin_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Admin info
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    
    -- Action details
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Maintenance mode
CREATE TABLE IF NOT EXISTS maintenance_mode (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_active BOOLEAN DEFAULT FALSE,
    message TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    estimated_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Access control
    allow_admins BOOLEAN DEFAULT TRUE,
    allow_ips TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

CREATE INDEX IF NOT EXISTS idx_user_investments_user_id ON user_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_investments_status ON user_investments(status);
CREATE INDEX IF NOT EXISTS idx_user_investments_end_date ON user_investments(end_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_earnings_user_id ON daily_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_date ON daily_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_investment_id ON daily_earnings(investment_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    code TEXT;
BEGIN
    -- Generate unique referral code
    code := UPPER(SUBSTRING(MD5(NEW.id::text || random()::text) FROM 1 FOR 8));
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = code) LOOP
        code := UPPER(SUBSTRING(MD5(NEW.id::text || random()::text) FROM 1 FOR 8));
    END LOOP;
    
    NEW.referral_code := code;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate daily earnings
CREATE OR REPLACE FUNCTION calculate_daily_earnings()
RETURNS TRIGGER AS $$
DECLARE
    plan_record investment_plans%ROWTYPE;
    daily_profit DECIMAL(15,2);
BEGIN
    -- Get plan details
    SELECT * INTO plan_record FROM investment_plans WHERE id = NEW.plan_id;
    
    -- Calculate daily profit
    daily_profit := (NEW.amount * plan_record.daily_profit_percentage) / 100;
    NEW.expected_profit := (NEW.amount * plan_record.total_profit_percentage) / 100;
    
    -- Set next profit date
    NEW.next_profit_date := NOW() + INTERVAL '1 day';
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to process daily earnings
CREATE OR REPLACE FUNCTION process_daily_earnings()
RETURNS VOID AS $$
DECLARE
    investment_record user_investments%ROWTYPE;
    plan_record investment_plans%ROWTYPE;
    daily_profit DECIMAL(15,2);
BEGIN
    FOR investment_record IN 
        SELECT * FROM user_investments 
        WHERE status = 'active' 
        AND (next_profit_date IS NULL OR next_profit_date <= NOW())
    LOOP
        -- Get plan details
        SELECT * INTO plan_record FROM investment_plans WHERE id = investment_record.plan_id;
        
        -- Calculate daily profit
        daily_profit := (investment_record.amount * plan_record.daily_profit_percentage) / 100;
        
        -- Insert daily earning
        INSERT INTO daily_earnings (user_id, investment_id, amount, earning_date, description)
        VALUES (
            investment_record.user_id,
            investment_record.id,
            daily_profit,
            CURRENT_DATE,
            'Daily profit from investment'
        );
        
        -- Update investment record
        UPDATE user_investments
        SET 
            actual_profit = actual_profit + daily_profit,
            days_completed = days_completed + 1,
            last_profit_date = NOW(),
            next_profit_date = NOW() + INTERVAL '1 day',
            updated_at = NOW()
        WHERE id = investment_record.id;
        
        -- Update user wallet if not compound
        IF NOT investment_record.is_compound THEN
            UPDATE profiles
            SET 
                wallet_balance = wallet_balance + daily_profit,
                total_earned = total_earned + daily_profit,
                updated_at = NOW()
            WHERE id = investment_record.user_id;
        END IF;
        
        -- Check if investment is completed
        IF investment_record.days_completed + 1 >= plan_record.duration_days THEN
            UPDATE user_investments
            SET 
                status = 'completed',
                end_date = NOW(),
                updated_at = NOW()
            WHERE id = investment_record.id;
        END IF;
    END LOOP;
END;
$$ language 'plpgsql';

-- Create triggers

-- Update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate referral code for new users
CREATE TRIGGER generate_profile_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();

-- Calculate investment details
CREATE TRIGGER calculate_investment_details
    BEFORE INSERT ON user_investments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_earnings();

-- Update updated_at for other tables
CREATE TRIGGER update_investment_plans_updated_at
    BEFORE UPDATE ON investment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data

-- Insert default investment plans
INSERT INTO investment_plans (name, description, type, min_amount, max_amount, duration_days, daily_profit_percentage, total_profit_percentage, allows_compound, allows_withdrawal, sort_order) VALUES
('Basic Plan', 'Perfect for beginners', 'basic', 500, 5000, 7, 2.5, 17.5, FALSE, TRUE, 1),
('Silver Plan', 'For regular investors', 'premium', 5000, 20000, 15, 3.0, 45.0, TRUE, TRUE, 2),
('Gold Plan', 'High returns plan', 'vip', 20000, 100000, 30, 3.5, 105.0, TRUE, TRUE, 3),
('Platinum Plan', 'VIP exclusive plan', 'vip', 100000, NULL, 60, 4.0, 240.0, TRUE, TRUE, 4)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('site_name', '"Uzumaki Investments"', 'Website name', TRUE),
('site_url', '"https://uzumaki.investments"', 'Website URL', TRUE),
('contact_email', '"support@uzumaki.investments"', 'Contact email', TRUE),
('support_phone', '"+91 99999 99999"', 'Support phone number', TRUE),
('min_deposit', '500', 'Minimum deposit amount', TRUE),
('max_deposit', '1000000', 'Maximum deposit amount', TRUE),
('min_withdrawal', '1000', 'Minimum withdrawal amount', TRUE),
('max_withdrawal', '500000', 'Maximum withdrawal amount', TRUE),
('referral_commission', '10', 'Referral commission percentage', TRUE),
('maintenance_mode', 'false', 'Maintenance mode status', TRUE),
('registration_enabled', 'true', 'New registration status', TRUE),
('deposit_enabled', 'true', 'Deposit functionality status', TRUE),
('withdrawal_enabled', 'true', 'Withdrawal functionality status', TRUE)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert default admin user (password: Admin@123)
-- Note: This user should be created through auth.signup in application
-- This is just a placeholder profile
INSERT INTO profiles (id, email, full_name, is_admin, is_verified, wallet_balance, referral_code) 
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@uzumaki.investments', 'System Administrator', TRUE, TRUE, 0, 'ADMIN001')
ON CONFLICT DO NOTHING;

-- Create scheduled job for daily earnings (commented out - needs pg_cron extension)
-- SELECT cron.schedule('process-daily-earnings', '0 0 * * *', 'SELECT process_daily_earnings()');

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Create RLS policies (basic setup - extend as needed)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- User investments policies
CREATE POLICY "Users can view own investments" ON user_investments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own investments" ON user_investments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all investments" ON user_investments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Daily earnings policies
CREATE POLICY "Users can view own earnings" ON daily_earnings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all earnings" ON daily_earnings
    FOR SELECT USING (
        EXISTS 
