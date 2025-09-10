'use client';

import { Observability } from '@observability/observability';
import { useState } from 'react';

export default function TestObservability() {
  const [eventCount, setEventCount] = useState(0);

  const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
    const instance = Observability.getInstance();
    if (instance) {
      instance.track(eventName, data);
      setEventCount(prev => prev + 1);
    } else {
      console.error('Observability not initialized');
    }
  };

  const triggerError = () => {
    try {
      throw new Error('Test error for observability');
    } catch (error) {
      console.error('Caught error:', error);
    }
  };

  const identifyUser = () => {
    const instance = Observability.getInstance();
    if (instance) {
      instance.identify('test-user-123', {
        email: 'test@example.com',
        plan: 'premium',
      });
      setEventCount(prev => prev + 1);
    }
  };

  const trackPageView = () => {
    const instance = Observability.getInstance();
    if (instance) {
      instance.page('Test Page', {
        category: 'Testing',
        section: 'Observability',
      });
      setEventCount(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Observability Test Page</h1>
      
      <div className="space-y-4 max-w-md">
        <div className="p-4 bg-gray-100 rounded">
          <p className="text-lg mb-2">Events tracked: {eventCount}</p>
        </div>

        <button
          onClick={() => trackEvent('button_click', { button: 'test-1' })}
          className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Track Button Click
        </button>

        <button
          onClick={() => trackEvent('custom_event', { 
            category: 'testing',
            value: Math.random() * 100,
            timestamp: new Date().toISOString()
          })}
          className="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Track Custom Event
        </button>

        <button
          onClick={identifyUser}
          className="w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Identify User
        </button>

        <button
          onClick={trackPageView}
          className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          Track Page View
        </button>

        <button
          onClick={triggerError}
          className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Trigger Console Error
        </button>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="font-semibold mb-2">Automatic Tracking:</h2>
          <ul className="text-sm space-y-1">
            <li>• Click events are tracked automatically</li>
            <li>• Scroll events are tracked automatically</li>
            <li>• Errors are captured automatically</li>
            <li>• Performance metrics are collected</li>
            <li>• Console errors are tracked</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Make sure the observability server is running on port 8787</li>
            <li>Click the buttons to generate different types of events</li>
            <li>Check the browser console for debug logs</li>
            <li>Check the server logs to see received events</li>
          </ol>
        </div>
      </div>
    </div>
  );
}