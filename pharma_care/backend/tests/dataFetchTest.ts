import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// test if you can fetch data from the database
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
console.log(process.env.MOCK_USER_ID);

if (!supabaseUrl || !supabaseKey) { 
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase.from('pharmacy_settings')
    .select(' * ');
    //.eq('user_id', string(process.env.MOCK_USER_ID));

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
        data: data
    }
    console.log(response);
}   