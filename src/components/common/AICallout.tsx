import React, { useState } from 'react';
import { Sparkles, Bot, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';

interface AICalloutProps {
  patientId: string;
  patientName?: string;
  className?: string;
}

export const AICallout: React.FC<AICalloutProps> = ({ patientId, patientName, className = '' }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.summarizeRecord(patientId);
      setSummary(res.summary);
      setDisclaimer(res.disclaimer);
      setIsExpanded(true);
    } catch (err) {
      console.error('AI summary error:', err);
    } finally {
      setIsLoading(false);
    }
  };


};
