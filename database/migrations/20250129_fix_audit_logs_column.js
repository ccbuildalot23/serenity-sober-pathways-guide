// Migration to fix audit_logs column name mismatch
// Changes 'action' column to '_action' to match codebase expectations

exports.up = async function(knex) {
  // Check if the audit_logs table exists
  const hasTable = await knex.schema.hasTable('audit_logs');
  
  if (!hasTable) {
    console.log('audit_logs table does not exist, skipping migration');
    return;
  }
  
  // Check which column exists
  const hasAction = await knex.schema.hasColumn('audit_logs', 'action');
  const hasUnderscoreAction = await knex.schema.hasColumn('audit_logs', '_action');
  
  if (hasAction && !hasUnderscoreAction) {
    // Rename 'action' to '_action'
    console.log('Renaming audit_logs.action to audit_logs._action');
    await knex.schema.alterTable('audit_logs', (table) => {
      table.renameColumn('action', '_action');
    });
    console.log('Column renamed successfully');
  } else if (hasUnderscoreAction) {
    console.log('audit_logs._action column already exists, skipping');
  } else if (!hasAction && !hasUnderscoreAction) {
    // Create the _action column if neither exists
    console.log('Creating audit_logs._action column');
    await knex.schema.alterTable('audit_logs', (table) => {
      table.string('_action', 100).notNullable().defaultTo('unknown');
    });
  }
};

exports.down = async function(knex) {
  // Revert the change
  const hasTable = await knex.schema.hasTable('audit_logs');
  
  if (!hasTable) {
    return;
  }
  
  const hasUnderscoreAction = await knex.schema.hasColumn('audit_logs', '_action');
  const hasAction = await knex.schema.hasColumn('audit_logs', 'action');
  
  if (hasUnderscoreAction && !hasAction) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.renameColumn('_action', 'action');
    });
  }
};