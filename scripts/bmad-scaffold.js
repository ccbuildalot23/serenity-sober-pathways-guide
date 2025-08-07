#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const name = args[1];
const options = args.slice(2).reduce((acc, arg, i, arr) => {
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
    acc[key] = value;
  }
  return acc;
}, {});

// Component template for healthcare features
const enhancedComponentTemplate = (name) => `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { EnhancedInputValidator } from '@/services/EnhancedInputValidator';
import { useAuth } from '@/contexts/AuthContext';

interface Enhanced${name}Props {
  className?: string;
}

export const Enhanced${name}: React.FC<Enhanced${name}Props> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Log component access for HIPAA compliance
    EnhancedSecurityAuditService.logSecurityEvent({
      action: 'component_accessed',
      component: 'Enhanced${name}',
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const handleAction = async () => {
    try {
      setLoading(true);
      
      // Validate inputs if needed
      const validation = EnhancedInputValidator.validateHealthcareData({
        // Add validation rules
      });
      
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Implement feature logic here
      
      toast({
        title: 'Success',
        description: '${name} action completed successfully',
      });
      
      // Log successful action
      EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_action_completed',
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('${name} error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      
      // Log error for monitoring
      EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_error',
        userId: user?.id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Enhanced ${name}</CardTitle>
        <CardDescription>
          HIPAA-compliant ${name.toLowerCase()} implementation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add your UI components here */}
          <Button 
            onClick={handleAction} 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Execute Action'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Export for centralized component index
export default Enhanced${name};
`;

// Service template for business logic
const serviceTemplate = (name) => `import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from './EnhancedSecurityAuditService';
import { EnhancedInputValidator } from './EnhancedInputValidator';

export class ${name}Service {
  private static instance: ${name}Service;

  private constructor() {}

  static getInstance(): ${name}Service {
    if (!${name}Service.instance) {
      ${name}Service.instance = new ${name}Service();
    }
    return ${name}Service.instance;
  }

  async create(data: any) {
    try {
      // Validate input
      const validation = EnhancedInputValidator.validateHealthcareData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Sanitize data
      const sanitized = EnhancedInputValidator.sanitizeInput(data);

      // Perform database operation
      const { data: result, error } = await supabase
        .from('${name.toLowerCase()}')
        .insert(sanitized)
        .single();

      if (error) throw error;

      // Log successful creation
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_created',
        resourceId: result.id,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error('${name}Service create error:', error);
      throw error;
    }
  }

  async read(id: string) {
    try {
      const { data, error } = await supabase
        .from('${name.toLowerCase()}')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Log read access
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_read',
        resourceId: id,
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      console.error('${name}Service read error:', error);
      throw error;
    }
  }

  async update(id: string, updates: any) {
    try {
      // Validate updates
      const validation = EnhancedInputValidator.validateHealthcareData(updates);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Sanitize updates
      const sanitized = EnhancedInputValidator.sanitizeInput(updates);

      const { data, error } = await supabase
        .from('${name.toLowerCase()}')
        .update(sanitized)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Log update
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_updated',
        resourceId: id,
        changes: Object.keys(updates),
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error) {
      console.error('${name}Service update error:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('${name.toLowerCase()}')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log deletion
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: '${name.toLowerCase()}_deleted',
        resourceId: id,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('${name}Service delete error:', error);
      throw error;
    }
  }
}

export default ${name}Service.getInstance();
`;

// Main execution
if (!command || !name) {
  console.log('Usage: bmad-scaffold <component|service> <Name> [--enhanced] [--domain=healthcare]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

if (command === 'component') {
  const componentDir = path.join(projectRoot, 'src', 'components', options.domain || 'features');
  const componentFile = path.join(componentDir, `Enhanced${name}.tsx`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
  }
  
  // Write component file
  fs.writeFileSync(componentFile, enhancedComponentTemplate(name));
  console.log(`✅ Created Enhanced${name} component at ${componentFile}`);
  
  // Update index.ts to export the new component
  const indexFile = path.join(projectRoot, 'src', 'components', 'index.ts');
  if (fs.existsSync(indexFile)) {
    const indexContent = fs.readFileSync(indexFile, 'utf-8');
    const exportLine = `export { Enhanced${name} } from './${options.domain || 'features'}/Enhanced${name}';`;
    if (!indexContent.includes(exportLine)) {
      fs.appendFileSync(indexFile, `\n${exportLine}`);
      console.log(`✅ Added export to components/index.ts`);
    }
  }
} else if (command === 'service') {
  const serviceDir = path.join(projectRoot, 'src', 'services');
  const serviceFile = path.join(serviceDir, `${name}Service.ts`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }
  
  // Write service file
  fs.writeFileSync(serviceFile, serviceTemplate(name));
  console.log(`✅ Created ${name}Service at ${serviceFile}`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

console.log('\n📋 Next steps:');
console.log(`1. Review the generated code in ${command === 'component' ? 'src/components' : 'src/services'}`);
console.log('2. Customize the implementation for your specific needs');
console.log('3. Add appropriate tests');
console.log('4. Update database schema if needed');
console.log('5. Run npm run bmad:validate to ensure compliance');