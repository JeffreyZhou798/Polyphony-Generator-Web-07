import { useState } from 'react';
import type { GenerationConfig } from '../services/magenta/types';
import { MusicWeightCalculator } from '../services/musicTheory/weightCalculator';

interface MusicDimensionControlsProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  disabled?: boolean;
}

const DIMENSIONS = [
  { id: 'pitch', name: '🎵 音高 (Pitch)', desc: '规则与AI音高选择平衡' },
  { id: 'rhythm', name: '🎵 节奏 (Rhythm)', desc: '规则与AI节奏平衡融合' },
  { id: 'harmony', name: '🎼 和声 (Harmony)', desc: '规则与AI和声平衡融合' },
  { id: 'interval', name: '↗️ 音程 (Interval)', desc: '规则与AI音程选择平衡' },
  { id: 'melodyProfile', name: '🎶 音型 (Melody Profile)', desc: '规则与AI旋律轮廓平衡' },
  { id: 'texture', name: '🎻 织体 (Texture)', desc: '规则与AI织体平衡' },
  { id: 'voiceLeading', name: '🔄 声部走向 (Voice Leading)', desc: '规则与AI声部走向平衡' }
] as const;

export default function MusicDimensionControls({ config, onChange, disabled }: MusicDimensionControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dimensions = MusicWeightCalculator.calculateAllDimensions(config as any);

  const handleDimensionChange = (dimId: string, value: number) => {
    const currentWeights = config.dimensionWeights || {};
    onChange({
      ...config,
      dimensionWeights: {
        ...currentWeights,
        [dimId]: value
      }
    });
  };

  const handleReset = () => {
    onChange({
      ...config,
      dimensionWeights: {}
    });
  };

  const getWeightForDimension = (dimId: keyof typeof dimensions) => {
    // For simplicity in UI, we pick the first sub-dimension's magenta weight as the representation
    // since we apply the same offset to all sub-dimensions of a main dimension.
    const dim = dimensions[dimId] as any;
    const firstKey = Object.keys(dim)[0];
    return dim[firstKey].magenta;
  };

  return (
    <div className="mb-4">
      <h5 className="card-title mb-3 d-flex justify-content-between align-items-center">
        <span><i className="bi bi-bar-chart-fill me-2"></i>📊 7个主要维度平衡</span>
        <button 
          className="btn btn-sm btn-outline-secondary" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          ⚙️ 高级选项: {isExpanded ? '折叠' : '展开'}
        </button>
      </h5>

      <div className="row g-2">
        {DIMENSIONS.map((dim) => {
          const weight = getWeightForDimension(dim.id as any);
          const rulesWeight = 100 - weight;
          return (
            <div key={dim.id} className="col-12">
              <div className="border rounded p-2 bg-light">
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-bold">{dim.name}</span>
                  <span className="badge bg-secondary">
                    {weight < 30 ? '保守' : weight > 70 ? 'AI主导' : '平衡'}
                  </span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${rulesWeight}%` }}
                    title={`Rules: ${rulesWeight}%`}
                  ></div>
                  <div 
                    className="progress-bar bg-info" 
                    role="progressbar" 
                    style={{ width: `${weight}%` }}
                    title={`AI: ${weight}%`}
                  ></div>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>{rulesWeight}% 规则</small>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>{dim.desc}</small>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>{weight}% AI</small>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isExpanded && (
        <div className="mt-3 p-3 border rounded bg-white">
          <h6 className="mb-3">⚙️ 维度特定调整 (Offset)</h6>
          <p className="text-muted small">在基础AI风格权重之上，对特定维度进行微调 (-50 到 +50)</p>
          
          {DIMENSIONS.map((dim) => {
            const offset = config.dimensionWeights?.[dim.id as keyof typeof config.dimensionWeights] || 0;
            return (
              <div key={`adv-${dim.id}`} className="mb-3">
                <div className="d-flex justify-content-between">
                  <label className="form-label small mb-0">{dim.name}: {offset > 0 ? `+${offset}` : offset}</label>
                </div>
                <input
                  type="range"
                  className="form-range"
                  min="-50"
                  max="50"
                  step="1"
                  value={offset}
                  onChange={(e) => handleDimensionChange(dim.id, parseInt(e.target.value))}
                  disabled={disabled}
                />
                <div className="d-flex justify-content-between" style={{ fontSize: '0.65rem' }}>
                  <span className="text-muted">更多规则 (-50)</span>
                  <span className="text-muted">0</span>
                  <span className="text-muted">更多AI (+50)</span>
                </div>
              </div>
            );
          })}
          
          <div className="text-end mt-2">
            <button 
              className="btn btn-sm btn-warning" 
              onClick={handleReset}
              disabled={disabled || !config.dimensionWeights || Object.keys(config.dimensionWeights).length === 0}
            >
              ↻ 重置所有调整
            </button>
          </div>
        </div>
      )}
    </div>
  );
}