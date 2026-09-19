import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://acrlumqqwhmowkxwfeaq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcmx1bXFxd2htb3dreHdmZWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjg0NTcsImV4cCI6MjEwNDgwNDQ1N30.uH8h29vljCcQGlxCxiZs8r4HPeDR-_ClKTkD7Ru0RQc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing fetch settings...");
  const { data: fetchSettings, error: fetchSettingsErr } = await supabase.from('settings').select('*');
  console.log("Fetch settings:", fetchSettings, fetchSettingsErr);

  console.log("\nTesting insert floor...");
  const { data: insertData, error: insertErr } = await supabase.from('floors').insert({
    id: 'test-floor-' + Date.now(),
    name: 'Test Floor'
  });
  console.log("Insert result:", insertData, insertErr);
}

testInsert();
