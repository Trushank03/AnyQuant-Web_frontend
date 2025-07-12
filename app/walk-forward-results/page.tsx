'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWalkForwardOptimizationResultDetail } from '../AllApiCalls';

interface WalkForwardResultsPageProps {
  // This will be populated from URL params or state
}

function WalkForwardResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'results' | 'graph' | 'report'>('results');
  const [showStdout, setShowStdout] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [checkedRows, setCheckedRows] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);

  // State for individual plots loaded via API
  const [apiPlots, setApiPlots] = useState<{ [key: string]: string }>({});
  const [plotLoading, setPlotLoading] = useState<{ [key: string]: boolean }>({});
  const [plotErrors, setPlotErrors] = useState<{ [key: string]: string }>({});

  // Debug: Log the entire result structure to understand how plots are stored
  useEffect(() => {
    if (result) {
      console.log('🔍 DEBUG: Full result structure:', result);
      console.log('🔍 DEBUG: Looking for plot fields...');
      
      // Debug: Check for z-statistic, p-value, and hypothesis_decision
      console.log('🔍 DEBUG: z_statistic:', result.z_statistic, typeof result.z_statistic);
      console.log('🔍 DEBUG: p_value:', result.p_value, typeof result.p_value);
      console.log('🔍 DEBUG: hypothesis_decision:', result.hypothesis_decision, typeof result.hypothesis_decision);
      
      // Check for the specific plot names
      const plotNames = [
        'train_validation_split_graph.html',
        'train_validation_Equity Final [$].html',
        'train_validation_Return (Ann.) [%].html'
      ];
      
      plotNames.forEach(name => {
        console.log(`🔍 DEBUG: Checking for ${name}:`, result[name] ? '✅ Found' : '❌ Not found');
        if (result[name]) {
          console.log(`🔍 DEBUG: ${name} content length:`, result[name].length);
        }
      });
      
      // Check plots_html object
      console.log('🔍 DEBUG: plots_html object:', result.plots_html);
      if (result.plots_html) {
        Object.keys(result.plots_html).forEach(key => {
          console.log(`🔍 DEBUG: plots_html.${key}:`, result.plots_html[key] ? '✅ Found' : '❌ Not found');
        });
      }
      
      // Check for any other HTML fields
      Object.keys(result).forEach(key => {
        if (key.includes('html') || key.includes('plot') || key.includes('graph')) {
          console.log(`🔍 DEBUG: Found HTML field: ${key}`, typeof result[key]);
        }
      });

      // Load plots via API if we have an optimization ID
      const optimizationId = result.walkforward_optimization_id || result.optimization_id;
      if (optimizationId) {
        console.log('🚀 DEBUG: Loading plots via API for optimization ID:', optimizationId);
        loadPlotsViaAPI(optimizationId);
      } else {
        console.log('❌ DEBUG: No optimization ID found in result:', {
          walkforward_optimization_id: result.walkforward_optimization_id,
          optimization_id: result.optimization_id
        });
      }
    }
  }, [result]);

  const baseUrl = "https://anyquant.co.uk"

  // Function to load individual plot via API
  const loadPlotViaAPI = async (optimizationId: number, plotType: string) => {
    setPlotLoading(prev => ({ ...prev, [plotType]: true }));
    setPlotErrors(prev => ({ ...prev, [plotType]: '' }));

    try {
      console.log(`🔄 Loading plot: ${plotType} for optimization ID: ${optimizationId}`);
      
      const response = await fetch(`${baseUrl}/api/walkforward-optimization-result/${optimizationId}/plot/${plotType}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded plot ${plotType}:`, data);
      
      setApiPlots(prev => ({
        ...prev,
        [plotType]: data.plot_html
      }));
    } catch (error: any) {
      console.error(`❌ Error loading plot ${plotType}:`, error);
      setPlotErrors(prev => ({
        ...prev,
        [plotType]: `Failed to load ${plotType}: ${error.message}`
      }));
    } finally {
      setPlotLoading(prev => ({ ...prev, [plotType]: false }));
    }
  };

  // Function to load all plots via API
  const loadPlotsViaAPI = async (optimizationId: number) => {
    console.log('🚀 Loading all plots via API for optimization ID:', optimizationId);
    
    const plotTypes = ['split_graph', 'equity_trend', 'return_trend'];
    
    // Load all plots in parallel
    await Promise.all(
      plotTypes.map(plotType => loadPlotViaAPI(optimizationId, plotType))
    );
  };

  // Get result from URL params, sessionStorage, or fetch by ID
  useEffect(() => {
    const resultParam = searchParams.get('result');
    const idParam = searchParams.get('id');
    
    if (resultParam) {
      try {
        setResult(JSON.parse(decodeURIComponent(resultParam)));
      } catch (error) {
        console.error('Error parsing result from URL:', error);
      }
    } else if (idParam) {
      // Fetch the result by ID
      const fetchResult = async () => {
        try {
          setIsLoading(true);
          console.log('Fetching WFO result by ID:', idParam);
          const data = await getWalkForwardOptimizationResultDetail(parseInt(idParam));
          console.log('Fetched WFO result:', data);
          setResult(data);
        } catch (error) {
          console.error('Error fetching WFO result by ID:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchResult();
    } else {
      // Check sessionStorage for optimization ID or minimal data
      const optimizationId = sessionStorage.getItem('walkForwardOptimizationId');
      const minimalData = sessionStorage.getItem('walkForwardMinimalData');
      
      if (optimizationId) {
        // Fetch the result by optimization ID
        const fetchResult = async () => {
          try {
            setIsLoading(true);
            console.log('Fetching WFO result by optimization ID:', optimizationId);
            const data = await getWalkForwardOptimizationResultDetail(parseInt(optimizationId));
            console.log('Fetched WFO result:', data);
            setResult(data);
            // Clear the sessionStorage after successful fetch
            sessionStorage.removeItem('walkForwardOptimizationId');
          } catch (error) {
            console.error('Error fetching WFO result by optimization ID:', error);
          } finally {
            setIsLoading(false);
          }
        };
        fetchResult();
      } else if (minimalData) {
        try {
          const parsedData = JSON.parse(minimalData);
          console.log('Using minimal data from sessionStorage:', parsedData);
          setResult(parsedData);
          // Clear the sessionStorage after using
          sessionStorage.removeItem('walkForwardMinimalData');
        } catch (error) {
          console.error('Error parsing minimal data from sessionStorage:', error);
        }
      } else {
        // Fallback to localStorage - check both keys (for backward compatibility)
        const storedResult = localStorage.getItem('walkForwardResult') || localStorage.getItem('walkForwardResultDetail');
        if (storedResult) {
          try {
            setResult(JSON.parse(storedResult));
          } catch (error) {
            console.error('Error parsing result from localStorage:', error);
          }
        }
      }
    }
  }, [searchParams]);

  // Helper: parse equity/final results per generation from stdout
  const parseGenerations = (stdout: string) => {
    if (!stdout) return [];
    const genRegex = /Generation (\d+):\n Best individual:\(([^)]+)\); \n Equity Final \[\$\]:(\d+\.?\d*);/g;
    const generations: { generation: number; params: string; equity: string }[] = [];
    let match;
    while ((match = genRegex.exec(stdout)) !== null) {
      generations.push({
        generation: Number(match[1]),
        params: match[2],
        equity: match[3],
      });
    }
    return generations;
  };

  // Handler for checkboxes
  const handleCheckbox = (idx: number) => {
    setCheckedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Helper: get value or dash
  const get = (row: any, key: string) => row[key] ?? '-';

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#000] text-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#85e1fe] mb-4">Loading Walk Forward Results...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#85e1fe] mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="fixed inset-0 bg-[#000] text-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#85e1fe] mb-4">No Walk Forward Results Found</div>
          <button 
            onClick={() => router.push('/strategy-testing')}
            className="bg-[#85e1fe] text-black px-6 py-3 rounded-md hover:bg-[#6bcae2] font-medium"
          >
            Go Back to Strategy Testing
          </button>
        </div>
      </div>
    );
  }

  const generations = parseGenerations(result.stdout || '');
  const folds = result.optimized_parameters_per_fold || [];
  const foldResults = result.fold_results || [];
  const plots: Record<string, string> = result.plots_html || {};

  return (
    <div className="fixed inset-0 bg-[#000] text-white flex flex-col z-50">
      {/* Sticky Full-Width Tab Bar */}
      <div className="sticky top-0 z-20 w-full bg-[#000]">
        <div className="flex w-full items-center px-8" style={{ minHeight: 48 }}>
          <div className="flex flex-1">
            {['results', 'graph', 'report'].map((t) => (
              <button
                key={t}
                className={`flex-1 py-2 text-lg font-semibold transition-colors duration-200
                  ${tab === t
                    ? 'bg-[#000] text-[#85e1fe]'
                    : 'bg-[#141721] text-gray-400'
                  }`}
                onClick={() => setTab(t as any)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Save Button below tab bar, right-aligned */}
      <div className="px-20 pb-4 flex justify-end">
        <button 
          onClick={() => router.push('/strategy-testing')} 
          className="bg-[#85e1fe] text-black px-3 py-1.5 rounded-md hover:bg-[#6bcae2] font-medium mt-2 text-sm"
        >
          Back to Strategy Testing
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        {/* Results Tab */}
        {tab === 'results' && (
          <>
            {/* Summary Stats */}
            <div className="mb-8">
              <div className="mb-4 text-lg font-semibold text-[#85e1fe]">Summary</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Status</div>
                  <div className="text-white font-semibold">{result.status}</div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Execution Time</div>
                  <div className="text-white font-semibold">{result.execution_time}s</div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">z-statistic</div>
                  <div className="text-white font-semibold">
                    {result.z_statistic !== undefined && result.z_statistic !== null 
                      ? result.z_statistic.toFixed(4) 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">p-value</div>
                  <div className="text-white font-semibold">
                    {result.p_value !== undefined && result.p_value !== null 
                      ? result.p_value.toFixed(4) 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Hypothesis Decision</div>
                  <div className="text-white font-semibold">
                    {result.hypothesis_decision || 'N/A'}
                  </div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Message</div>
                  <div className="text-white font-semibold">{result.message}</div>
                </div>
              </div>
            </div>

            {/* Average Performance */}
            <div className="mb-8">
              <div className="mb-4 text-lg font-semibold text-[#85e1fe]">Average Performance</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Avg Training Equity</div>
                  <div className="text-white font-semibold">${result.avg_training_equity?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Avg Validation Equity</div>
                  <div className="text-white font-semibold">${result.avg_validation_equity?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Avg Training Return</div>
                  <div className="text-white font-semibold">{(result.avg_training_return * 100)?.toFixed(2) || '0.00'}%</div>
                </div>
                <div className="bg-[#141721] rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Avg Validation Return</div>
                  <div className="text-white font-semibold">{(result.avg_validation_return * 100)?.toFixed(2) || '0.00'}%</div>
                </div>
              </div>
            </div>

            {/* Fold Results Table - Matching PreviousOptimisationView style */}
            {foldResults.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 text-lg font-semibold text-[#85e1fe]">Fold Results</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-[#000] text-white font-bold">
                        <th className="px-2 py-2 text-left">Pass</th>
                        <th className="px-2 py-2 text-left">Training Equity [$]</th>
                        <th className="px-2 py-2 text-left">Validation Equity [$]</th>
                        <th className="px-2 py-2 text-left">Training Return [%]</th>
                        <th className="px-2 py-2 text-left">Validation Return [%]</th>
                        <th className="px-2 py-2 text-left">Training Sharpe</th>
                        <th className="px-2 py-2 text-left">Validation Sharpe</th>
                        <th className="px-2 py-2 text-left">Training Max DD [%]</th>
                        <th className="px-2 py-2 text-left">Validation Max DD [%]</th>
                        <th className="px-2 py-2 text-left">Training Trades</th>
                        <th className="px-2 py-2 text-left">Validation Trades</th>
                        <th className="px-2 py-2 text-left">Parameters</th>
                        <th className="px-2 py-2 text-left"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {foldResults.map((fold: any, idx: number) => (
                        <tr
                          key={idx}
                          className="bg-[#000] text-white"
                        >
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!checkedRows[idx]}
                                onChange={() => handleCheckbox(idx)}
                                className="accent-[#85e1fe] w-4 h-4"
                              />
                              <span className="font-medium">{fold.fold}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2">{get(fold, 'training_equity')?.toFixed(2)}</td>
                          <td className="px-2 py-2">{get(fold, 'validation_equity')?.toFixed(2)}</td>
                          <td className="px-2 py-2">{((get(fold, 'training_return') || 0) * 100).toFixed(2)}</td>
                          <td className="px-2 py-2">{((get(fold, 'validation_return') || 0) * 100).toFixed(2)}</td>
                          <td className="px-2 py-2">{get(fold, 'training_sharpe')?.toFixed(2)}</td>
                          <td className="px-2 py-2">{get(fold, 'validation_sharpe')?.toFixed(2)}</td>
                          <td className="px-2 py-2">{((get(fold, 'training_max_drawdown') || 0) * 100).toFixed(2)}</td>
                          <td className="px-2 py-2">{((get(fold, 'validation_max_drawdown') || 0) * 100).toFixed(2)}</td>
                          <td className="px-2 py-2">{get(fold, 'training_trades')}</td>
                          <td className="px-2 py-2">{get(fold, 'validation_trades')}</td>
                          <td className="px-2 py-2 max-w-[200px] truncate" title={JSON.stringify(fold.parameters)}>
                            {Object.entries(fold.parameters || {})
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button className="p-1">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="5" r="1.5" fill="#fff"/>
                                <circle cx="12" cy="12" r="1.5" fill="#fff"/>
                                <circle cx="12" cy="19" r="1.5" fill="#fff"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Optimized Parameters per Fold */}
            {folds.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 text-lg font-semibold text-[#85e1fe]">Optimized Parameters per Fold</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-[#1A1D2D] text-white">
                        <th className="px-2 py-2 text-left">Fold</th>
                        {folds.length > 0 && Object.keys(folds[0]).map((key) => (
                          <th key={key} className="px-2 py-2 text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {folds.map((fold: any, idx: number) => (
                        <tr key={idx} className="bg-[#141721] text-white">
                          <td className="px-2 py-2">{idx + 1}</td>
                          {Object.values(fold).map((value: any, i: number) => (
                            <td key={i} className="px-2 py-2">{String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generations Table */}
            {generations.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 text-lg font-semibold text-[#85e1fe]">Equity by Generation</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-[#1A1D2D] text-white">
                        <th className="px-2 py-2 text-left">Generation</th>
                        <th className="px-2 py-2 text-left">Best Parameters</th>
                        <th className="px-2 py-2 text-left">Equity Final [$]</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generations.map((gen, idx) => (
                        <tr key={idx} className="bg-[#141721] text-white">
                          <td className="px-2 py-2">{gen.generation}</td>
                          <td className="px-2 py-2 max-w-[300px] truncate" title={gen.params}>{gen.params}</td>
                          <td className="px-2 py-2">{gen.equity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stdout log */}
            {result.stdout && (
              <div className="mb-8">
                <button 
                  onClick={() => setShowStdout(!showStdout)} 
                  className="text-[#85e1fe] underline mb-4"
                >
                  {showStdout ? 'Hide' : 'Show'} Raw Log
                </button>
                {showStdout && (
                  <pre className="bg-[#141721] text-xs text-white rounded p-4 max-h-64 overflow-auto whitespace-pre-wrap">
                    {result.stdout}
                  </pre>
                )}
              </div>
            )}
          </>
        )}

        {/* Graph Tab */}
        {tab === 'graph' && (
          <div className="w-full grid grid-cols-1 gap-8">
            {/* Debug: Show available plots */}
            <div className="mb-4 p-4 bg-[#141721] rounded-lg">
              <div className="text-[#85e1fe] font-semibold mb-2">Debug Info:</div>
              <div className="text-xs text-gray-400">
                <div className="mb-2">
                  <div className="text-[#85e1fe]">API Loaded Plots:</div>
                  {Object.keys(apiPlots).map(key => (
                    <div key={key} className="ml-2">• {key}: ✅ Loaded</div>
                  ))}
                  {Object.keys(plotLoading).filter(key => plotLoading[key]).map(key => (
                    <div key={key} className="ml-2">• {key}: 🔄 Loading...</div>
                  ))}
                  {Object.keys(plotErrors).filter(key => plotErrors[key]).map(key => (
                    <div key={key} className="ml-2">• {key}: ❌ Error</div>
                  ))}
                </div>
                <div className="mb-2">
                  <div className="text-[#85e1fe]">Optimization ID:</div>
                  <div className="ml-2">• walkforward_optimization_id: {result?.walkforward_optimization_id || 'N/A'}</div>
                  <div className="ml-2">• optimization_id: {result?.optimization_id || 'N/A'}</div>
                </div>
                <div className="mb-2">
                  <div className="text-[#85e1fe]">Result Object Plots:</div>
                  {Object.keys(result || {}).filter(key => key.includes('html') || key.includes('plot') || key.includes('graph')).map(key => (
                    <div key={key} className="ml-2">• {key}: {result[key] ? 'Available' : 'Not available'}</div>
                  ))}
                </div>
                {Object.keys(plots).length > 0 && (
                  <div className="mt-2">
                    <div className="text-[#85e1fe]">Legacy Plots Object:</div>
                    {Object.keys(plots).map(key => (
                      <div key={key} className="ml-2">• {key}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* API Loaded Plots - Primary Method */}
            {Object.entries(apiPlots).map(([plotType, plotHtml]) => (
              <div key={plotType}>
                <div className="mb-2 font-bold text-white text-base">
                  {plotType === 'split_graph' && 'Train/Validation Split Graph'}
                  {plotType === 'equity_trend' && 'Equity Trend Over Folds'}
                  {plotType === 'return_trend' && 'Return Trend Over Folds'}
                  <span className="text-xs text-gray-400"> (API Loaded)</span>
                </div>
                <iframe
                  title={plotType}
                  className="w-full h-[400px] bg-white"
                  style={{ border: 'none' }}
                  srcDoc={plotHtml}
                />
              </div>
            ))}

            {/* Loading States for API Plots */}
            {Object.entries(plotLoading).map(([plotType, isLoading]) => {
              if (isLoading) {
                return (
                  <div key={plotType}>
                    <div className="mb-2 font-bold text-white text-base">
                      {plotType === 'split_graph' && 'Train/Validation Split Graph'}
                      {plotType === 'equity_trend' && 'Equity Trend Over Folds'}
                      {plotType === 'return_trend' && 'Return Trend Over Folds'}
                      <span className="text-xs text-gray-400"> (Loading...)</span>
                    </div>
                    <div className="w-full h-[400px] bg-[#141721] flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#85e1fe] mx-auto mb-2"></div>
                        <div className="text-gray-400">Loading {plotType}...</div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Error States for API Plots */}
            {Object.entries(plotErrors).map(([plotType, error]) => {
              if (error) {
                return (
                  <div key={plotType}>
                    <div className="mb-2 font-bold text-white text-base">
                      {plotType === 'split_graph' && 'Train/Validation Split Graph'}
                      {plotType === 'equity_trend' && 'Equity Trend Over Folds'}
                      {plotType === 'return_trend' && 'Return Trend Over Folds'}
                      <span className="text-xs text-red-400"> (Error)</span>
                    </div>
                    <div className="w-full h-[400px] bg-[#141721] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-red-400 mb-2">{error}</div>
                        <button 
                          onClick={() => {
                            const optimizationId = result.walkforward_optimization_id || result.optimization_id;
                            if (optimizationId) {
                              loadPlotViaAPI(optimizationId, plotType);
                            }
                          }}
                          className="bg-[#85e1fe] text-black px-4 py-2 rounded-md hover:bg-[#6bcae2] text-sm"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Fallback: Legacy Plot Rendering */}
            {Object.keys(apiPlots).length === 0 && (
              <>
                {/* Comprehensive Plot Rendering - Try all possible locations */}
                {(() => {
                  const plotConfigs = [
                    {
                      name: 'Train Validation Split Graph',
                      keys: [
                        'train_validation_split_graph.html',
                        'split_graph_html',
                        'plots_html.train_validation_split_graph.html',
                        'plots.split_graph'
                      ]
                    },
                    {
                      name: 'Train Validation Equity Final',
                      keys: [
                        'train_validation_Equity Final [$].html',
                        'equity_trend_html',
                        'plots_html.train_validation_Equity Final [$].html',
                        'plots.equity_trend'
                      ]
                    },
                    {
                      name: 'Train Validation Return (Ann.)',
                      keys: [
                        'train_validation_Return (Ann.) [%].html',
                        'return_trend_html',
                        'plots_html.train_validation_Return (Ann.) [%].html',
                        'plots.return_trend'
                      ]
                    }
                  ];

                  return plotConfigs.map((config, index) => {
                    let plotHtml = null;
                    let source = '';

                    // Try each possible key location
                    for (const key of config.keys) {
                      if (key.includes('.')) {
                        // Handle nested keys like 'plots_html.train_validation_split_graph.html'
                        const [parentKey, childKey] = key.split('.');
                        if (result[parentKey] && result[parentKey][childKey]) {
                          plotHtml = result[parentKey][childKey];
                          source = `${parentKey}.${childKey}`;
                          break;
                        }
                      } else {
                        // Handle direct keys
                        if (result[key]) {
                          plotHtml = result[key];
                          source = key;
                          break;
                        }
                      }
                    }

                    if (plotHtml && typeof plotHtml === 'string' && plotHtml.includes('<html')) {
                      return (
                        <div key={index}>
                          <div className="mb-2 font-bold text-white text-base">
                            {config.name} <span className="text-xs text-gray-400">(from {source})</span>
                          </div>
                          <iframe
                            title={config.name}
                            className="w-full h-[400px] bg-white"
                            style={{ border: 'none' }}
                            srcDoc={plotHtml}
                          />
                        </div>
                      );
                    }
                    return null;
                  });
                })()}

                {/* Variable Trends */}
                {result.variable_trends_html && (
                  <div>
                    <div className="mb-2 font-bold text-white text-base">Variable Trends</div>
                    <iframe
                      title="Variable Trends"
                      className="w-full h-[400px] bg-white"
                      style={{ border: 'none' }}
                      srcDoc={result.variable_trends_html}
                    />
                  </div>
                )}

                {/* Render all plots from plots_html object */}
                {Object.entries(plots).map(([name, html]) => {
                  if (typeof html === 'string' && html.includes('<html')) {
                    return (
                      <div key={name}>
                        <div className="mb-2 font-bold text-white text-base">{name} <span className="text-xs text-gray-400">(from plots_html)</span></div>
                        <iframe
                          title={name}
                          className="w-full h-[400px] bg-white"
                          style={{ border: 'none' }}
                          srcDoc={html}
                        />
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Render any other HTML fields that might contain plots */}
                {Object.entries(result).map(([key, value]) => {
                  if (typeof value === 'string' && value.includes('<html') && 
                      (key.includes('html') || key.includes('plot') || key.includes('graph'))) {
                    return (
                      <div key={key}>
                        <div className="mb-2 font-bold text-white text-base">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} <span className="text-xs text-gray-400">(direct field)</span></div>
                        <iframe
                          title={key}
                          className="w-full h-[400px] bg-white"
                          style={{ border: 'none' }}
                          srcDoc={value}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </div>
        )}

        {/* Report Tab */}
        {tab === 'report' && (
          <div>
            <div className="mb-6 text-2xl font-bold text-[#85e1fe] text-center">Walk Forward Analysis Report</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Column 1 */}
              <div>
                <div className="mb-2 flex flex-col gap-1">
                  {[
                    ['Status', result.status],
                    ['Execution Time', `${result.execution_time}s`],
                    ['z-statistic', result.z_statistic],
                    ['p-value', result.p_value],
                    ['Hypothesis Decision', result.hypothesis_decision],
                    ['Total Folds', foldResults.length],
                    ['Total Generations', generations.length],
                    ['Avg Training Equity', `$${result.avg_training_equity?.toFixed(2) || 'N/A'}`],
                    ['Avg Validation Equity', `$${result.avg_validation_equity?.toFixed(2) || 'N/A'}`],
                    ['Avg Training Return', `${(result.avg_training_return * 100)?.toFixed(2) || '0.00'}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-gray-800 py-1 text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-white font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Column 2 */}
              <div>
                <div className="mb-2 flex flex-col gap-1">
                  {[
                    ['Message', result.message],
                    ['Walk Forward ID', result.walkforward_optimization_id],
                    ['Best Fold', foldResults.length > 0 ? '1' : 'N/A'],
                    ['Average Parameters', folds.length > 0 ? Object.keys(folds[0]).length : 'N/A'],
                    ['Optimization Algorithm', 'Genetic Algorithm'],
                    ['Validation Method', 'Walk Forward'],
                    ['Statistical Significance', result.p_value < 0.05 ? 'Significant' : 'Not Significant'],
                    ['Avg Validation Return', `${(result.avg_validation_return * 100)?.toFixed(2) || '0.00'}%`],
                    ['Avg Training Sharpe', result.avg_training_sharpe?.toFixed(2) || 'N/A'],
                    ['Avg Validation Sharpe', result.avg_validation_sharpe?.toFixed(2) || 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-gray-800 py-1 text-sm">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-white font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function WalkForwardResultsLoading() {
  return (
    <div className="fixed inset-0 bg-[#000] text-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-2xl font-bold text-[#85e1fe] mb-4">Loading Walk Forward Results...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#85e1fe] mx-auto"></div>
      </div>
    </div>
  );
}

export default function WalkForwardResultsPage() {
  return (
    <Suspense fallback={<WalkForwardResultsLoading />}>
      <WalkForwardResultsContent />
    </Suspense>
  );
} 