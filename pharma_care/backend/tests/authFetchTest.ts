import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// test the if a user can sign up
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) { 
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase.auth.signUp({
    email: 'diriho0407@gmail.com',
    password: 'ahanihe',
})
  
if (error) {
    const response = {
        status: 'Error Status 401',
        message: 'Error signing up',
        error: error.message
    }
    console.log(response);
} else {
    const response = {
        status: 'Success Status 200',
        message: 'User signed up successfully',
        user: data.user
    }
    console.log(response);
}

// test if you can extract the user infromation from the access token
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.MOCK_USER_EMAIL!,
    password: process.env.MOCK_USER_PASSWORD!
})
if (signInError) {
    const response = {
        status: 'Error Status 401',
        message: 'Error signing in',
        error: signInError.message

    }
    console.log(response);
} else {
    const { data: userData, error: userError } = await supabase.auth.getUser(signInData.session!.access_token)
    if (userError) {
        const response = {
            status: 'Error Status 401',
            message: 'Error fetching user data',
            error: userError.message

        }
        console.log(response);
    } else {
        const response = {
            status: 'Success Status 200',
            message: 'User data fetched successfully',
            user: userData.user
        }
        console.log(response); 
    }
}