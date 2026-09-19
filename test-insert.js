import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qilrwcmuzcwqvzklotxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbHJ3Y211emN3cXZ6a2xvdHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MjQwMTgsImV4cCI6MjEwNTQwMDAxOH0.F02QxECng2gn4weBa9JwTQpjehmmYvUfJNZoc8hEup8'
);

async function test() {
  const { data, error } = await supabase.from('floors').insert({
    id: 'test-floor-id',
    name: 'Test Floor'
  });
  console.log("Insert result:");
  console.dir(error || data);
}

test();
