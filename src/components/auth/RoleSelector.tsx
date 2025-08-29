import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle, Stethoscope, Heart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoleSelectorProps {
  onSelectRole: (role: 'patient' | 'provider' | 'supporter') => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelectRole }) => {
  const roles = [
    {
      id: 'patient',
      title: 'Patient',
      description: 'I am seeking support for my recovery journey',
      icon: UserCircle,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      benefits: ['Daily check-ins', 'Crisis support', 'Peer community', 'Progress tracking']
    },
    {
      id: 'provider',
      title: 'Healthcare Provider',
      description: 'I am a licensed healthcare professional',
      icon: Stethoscope,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      benefits: ['Patient management', 'Analytics dashboard', 'Care planning', 'Secure messaging']
    },
    {
      id: 'supporter',
      title: 'Support Person',
      description: 'I am here to support someone in recovery',
      icon: Heart,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      benefits: ['Crisis alerts', 'Progress monitoring', 'Resource library', 'Communication tools']
    }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Role</CardTitle>
        <CardDescription>
          Select how you'll be using Serenity to get started with the right experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary"
                  onClick={() => onSelectRole(role.id as 'patient' | 'provider' | 'supporter')}
                >
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-full ${role.color} flex items-center justify-center mb-4 mx-auto`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg text-center mb-2">{role.title}</h3>
                    <p className="text-sm text-gray-600 text-center mb-4">{role.description}</p>
                    <ul className="space-y-1 mb-4">
                      {role.benefits.map((benefit) => (
                        <li key={benefit} className="text-xs text-gray-500 flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRole(role.id as 'patient' | 'provider' | 'supporter');
                      }}
                    >
                      Continue as {role.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};