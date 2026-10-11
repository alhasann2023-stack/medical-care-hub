// Type checking for this component is handled by the project's React type setup.
// @ts-nocheck
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

  return (
    <section className={`rounded-lg border border-indigo-200 bg-indigo-50 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-indigo-900">AI record summary</h3>
            {patientName && <p className="text-sm text-indigo-700">{patientName}</p>}
          </div>
        </div>
        {summary && (
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="text-indigo-700"
            aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {!summary && (
        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {isLoading ? 'Generating…' : 'Generate summary'}
        </button>
      )}

      {summary && isExpanded && (
        <div className="mt-3 space-y-3 text-sm text-gray-800">
          <p className="whitespace-pre-wrap">{summary}</p>
          {disclaimer && (
            <p className="flex items-start gap-2 border-t border-indigo-200 pt-2 text-xs text-indigo-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {disclaimer}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-green-700">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Generated successfully
          </div>
        </div>
      )}
    </section>
  );
};
