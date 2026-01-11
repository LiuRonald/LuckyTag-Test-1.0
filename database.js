const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  console.error('Please set these in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database (verify connection)
async function initializeDatabase() {
  try {
    // Test connection by querying users table
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('Database connection error:', error);
      throw error;
    }
    console.log('✓ Connected to Supabase successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Query helper functions
async function runAsync(table, operation, data) {
  try {
    let query = supabase.from(table);
    
    if (operation === 'insert') {
      const { data: result, error } = await query.insert([data]).select();
      if (error) throw error;
      return result;
    } else if (operation === 'update') {
      const { data: result, error } = await query.update(data).eq('id', data.id).select();
      if (error) throw error;
      return result;
    } else if (operation === 'delete') {
      const { error } = await query.delete().eq('id', data);
      if (error) throw error;
      return { success: true };
    }
  } catch (error) {
    throw error;
  }
}

async function getAsync(table, filters = {}) {
  try {
    let query = supabase.from(table).select('*');
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }
    return data;
  } catch (error) {
    throw error;
  }
}

async function allAsync(table, filters = {}, options = {}) {
  try {
    let query = supabase.from(table).select('*');
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    // Apply options (order, limit, etc)
    if (options.order) {
      const { column, ascending } = options.order;
      query = query.order(column, { ascending });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
}

// Raw SQL query function for complex queries
async function rawQuery(sql, params = []) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql, params });
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  supabase,
  initializeDatabase,
  runAsync,
  getAsync,
  allAsync,
  rawQuery
};
