const { supabaseAdmin } = require('./config/supabase');

async function runMigration() {
  try {
    console.log('🚀 Starting mission order migration...');
    
    // Check current schema
    console.log('Checking current questions table schema...');
    const { data: questionsSchema, error: schemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'questions')
      .eq('table_schema', 'public');
    
    if (schemaError) {
      console.error('Error checking schema:', schemaError);
      return;
    }
    
    console.log('Current questions table columns:', questionsSchema.map(col => col.column_name));
    
    const hasDisplayOrder = questionsSchema.some(col => col.column_name === 'display_order');
    
    if (hasDisplayOrder) {
      console.log('✅ display_order column already exists');
    } else {
      console.log('❌ display_order column missing - needs manual addition');
      console.log('Please run this SQL in Supabase dashboard:');
      console.log('ALTER TABLE public.questions ADD COLUMN display_order INTEGER DEFAULT 0;');
    }
    
    // Check games table
    console.log('\nChecking current games table schema...');
    const { data: gamesSchema, error: gamesSchemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'games')
      .eq('table_schema', 'public');
    
    if (gamesSchemaError) {
      console.error('Error checking games schema:', gamesSchemaError);
      return;
    }
    
    console.log('Current games table columns:', gamesSchema.map(col => col.column_name));
    
    const hasMissionOrder = gamesSchema.some(col => col.column_name === 'mission_order');
    
    if (hasMissionOrder) {
      console.log('✅ mission_order column already exists');
    } else {
      console.log('❌ mission_order column missing - needs manual addition');
      console.log('Please run this SQL in Supabase dashboard:');
      console.log("ALTER TABLE public.games ADD COLUMN mission_order VARCHAR(50) DEFAULT 'point_value';");
    }
    
    console.log('\n🎉 Schema check completed!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
}

runMigration();