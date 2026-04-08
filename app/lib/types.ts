export interface CensusRecord {
  employee_id: string;
  dob: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  mobile_phone: string;
  ssn: string;
  benefits_account_type: 'HSA' | 'FSA' | 'DCFSA';
  employment_start_date: string;
  work_email: string;
  employment_status: 'Active' | 'Terminated';
  employment_term_date: string;
  home_address_1: string;
  home_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  mailing_address_1: string;
  mailing_address_2: string;
  mailing_city: string;
  mailing_state: string;
  mailing_postal_code: string;
  coverage_tier: string;
  plan_effective_date: string;
  plan_term_date: string;
  employer_amount: number;
  employee_amount: number;
  benefits_amount: number;
  source: string;
  sync_timestamp: string;
  _created_at?: string;
  _updated_at?: string;
  _is_new?: boolean;
  _is_updated?: boolean;
}

export interface ContributionRecord {
  employee_id: string;
  tax_year: number;
  employee_contribution: number;
  employer_contribution: number;
  benefits_account_type: 'HSA' | 'FSA' | 'DCFSA';
  payroll_date: string;
  payroll_run_id: string;
  source: string;
  sync_timestamp: string;
  _created_at?: string;
  _updated_at?: string;
  _is_new?: boolean;
  _is_updated?: boolean;
}

export interface ReconciliationRecord {
  payroll_run_id: string;
  payroll_date: string;
  source: string;
  total_ee_contributions: number;
  total_er_contributions: number;
  total_contributions: number;
  expected_employee_count: number;
  actual_employee_count: number;
  status: 'Matched' | 'Mismatch' | 'Incomplete';
  sync_timestamp: string;
  _created_at?: string;
  _updated_at?: string;
  _is_new?: boolean;
  _is_updated?: boolean;
}

export interface StatsData {
  total_employees: number;
  active: number;
  terminated: number;
  new_census: number;
  updated_census: number;
  total_contributions: number;
  new_contributions: number;
  reconciliation_runs: number;
  last_sync: string;
  recon_status: string;
  total_ee: number;
  total_er: number;
}
