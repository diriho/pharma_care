import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// test if you can fetch data from the database
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
console.log(process.env.MOCK_USER_ID);

if (!supabaseUrl || !supabaseKey) { 
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
}

// Create a Supabase client instance and aunthenticate the user to get their database rows
const supabase = createClient(supabaseUrl, supabaseKey)
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.MOCK_USER_EMAIL!,
    password: process.env.MOCK_USER_PASSWORD!
})

let { data: pharmacy_settings, error } = await supabase
  .from('pharmacy_settings')
  .select('*')

if (error) {
    const response = {
        status: 'Error Status 401',
        message: 'Error fetching data',
        error: error.message
    }
    console.log(response);
} else {
    const response = {
        status: 'Success Status 200',
        message: 'Data fetched successfully',
        data: pharmacy_settings
    }
    console.log(response);
}   