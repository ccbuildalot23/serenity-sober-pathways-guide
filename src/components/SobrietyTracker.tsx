
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, DollarSign, Trophy } from 'lucide-react';

const SobrietyTracker = () => {
  const [sobrietyDate, setSobrietyDate] = useState<string>('');
  const [dailyCost, setDailyCost] = useState<string>('15');
  const [days, setDays] = useState<number>(0);
  const [moneySaved, setMoneySaved] = useState<number>(0);

  // Load data from localStorage
  useEffect(() => {
    const savedDate = localStorage.getItem('sobrietyDate');
    const savedCost = localStorage.getItem('dailyCost');
    
    if (savedDate) {
      setSobrietyDate(savedDate);
      calculateProgress(savedDate, savedCost || '15');
    }
    if (savedCost) {
      setDailyCost(savedCost);
    }
  }, []);

  const calculateProgress = (startDate: string, cost: string) => {
    if (!startDate) return;
    
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    setDays(diffDays);
    setMoneySaved(diffDays * parseFloat(cost));
  };

  const handleDateChange = (newDate: string) => {
    setSobrietyDate(newDate);
    localStorage.setItem('sobrietyDate', newDate);
    calculateProgress(newDate, dailyCost);
  };

  const handleCostChange = (newCost: string) => {
    setDailyCost(newCost);
    localStorage.setItem('dailyCost', newCost);
    if (sobrietyDate) {
      calculateProgress(sobrietyDate, newCost);
    }
  };

  const getStreakMessage = () => {
    if (days === 0) return "Today is day one!";
    if (days === 1) return "One day strong!";
    if (days < 7) return `${days} days of courage!`;
    if (days < 30) return `${Math.floor(days / 7)} weeks of strength!`;
    if (days < 365) return `${Math.floor(days / 30)} months of recovery!`;
    return `${Math.floor(days / 365)} years of resilience!`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
            <h3 className="text-xl font-bold serenity-navy">Your Journey</h3>
          </div>
          
          {days > 0 ? (
            <>
              <div className="mb-4">
                <div className="text-4xl font-bold serenity-emerald mb-2">{days}</div>
                <div className="text-lg text-gray-700">{getStreakMessage()}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Days Sober</div>
                  <div className="text-2xl font-bold serenity-navy">{days}</div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Money Saved</div>
                  <div className="text-2xl font-bold serenity-emerald">${moneySaved.toFixed(0)}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-600 mb-4">
              Set your sobriety start date to begin tracking your progress
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-4 serenity-navy">Track Your Progress</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sobriety Start Date
            </label>
            <Input
              type="date"
              value={sobrietyDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Cost (Previous Habit)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={dailyCost}
                onChange={(e) => handleCostChange(e.target.value)}
                className="pl-8"
                placeholder="15"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SobrietyTracker;
