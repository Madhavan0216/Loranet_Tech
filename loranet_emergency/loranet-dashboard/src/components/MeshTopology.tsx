import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const roleColors: Record<string, string> = {
  gateway: '#111111',
  relay: '#2D8A56',
  rescue: '#2563EB',
  victim: '#E85D3F',
};

const roleIcons: Record<string, string> = {
  gateway: '⬡',
  relay: '◈',
  rescue: '✚',
  victim: '●',
};

const linkColors: Record<string, string> = {
  strong: '#2D8A56',
  moderate: '#D4920A',
  weak: '#E85D3F',
  broken: '#DADADA',
};

export default function MeshTopology({ compact = false }: { compact?: boolean }) {
  const { nodes, links, selectedNodeId, selectNode } = useApp();
  const svgRef = useRef<SVGSVGElement>(null);

  const width = compact ? 380 : 700;
  const height = compact ? 300 : 500;

  // Simple force-directed-like positioning based on lat/lng
  const minLat = Math.min(...nodes.map(n => n.lat));
  const maxLat = Math.max(...nodes.map(n => n.lat));
  const minLng = Math.min(...nodes.map(n => n.lng));
  const maxLng = Math.max(...nodes.map(n => n.lng));

  const padding = compact ? 40 : 60;

  const getPos = (lat: number, lng: number) => ({
    x: padding + ((lng - minLng) / (maxLng - minLng || 1)) * (width - padding * 2),
    y: padding + ((maxLat - lat) / (maxLat - minLat || 1)) * (height - padding * 2),
  });

  const nodePositions = nodes.map(n => ({
    ...n,
    ...getPos(n.lat, n.lng),
  }));

  useEffect(() => {
    // Could add animation here
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ minHeight: compact ? 280 : 450 }}
    >
      {/* Grid pattern */}
      <defs>
        <pattern id="meshGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#meshGrid)" rx="12" />

      {/* Links */}
      {links.map((link, i) => {
        const fromNode = nodePositions.find(n => n.id === link.from);
        const toNode = nodePositions.find(n => n.id === link.to);
        if (!fromNode || !toNode) return null;
        return (
          <g key={i}>
            <line
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={linkColors[link.quality]}
              strokeWidth={link.quality === 'broken' ? 1 : 2}
              strokeDasharray={link.quality === 'broken' ? '6 4' : link.quality === 'weak' ? '4 2' : 'none'}
              opacity={link.quality === 'broken' ? 0.4 : 0.7}
            />
            {!compact && (
              <text
                x={(fromNode.x + toNode.x) / 2}
                y={(fromNode.y + toNode.y) / 2 - 6}
                textAnchor="middle"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill="#999"
              >
                {link.rssi} dBm
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodePositions.map(node => {
        const isSelected = selectedNodeId === node.id;
        const radius = compact ? 14 : 18;
        return (
          <g
            key={node.id}
            className="mesh-node"
            onClick={() => selectNode(isSelected ? null : node.id)}
          >
            {/* Selection ring */}
            {isSelected && (
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 6}
                fill="none"
                stroke={roleColors[node.role]}
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.5"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${node.x} ${node.y}`}
                  to={`360 ${node.x} ${node.y}`}
                  dur="8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={radius}
              fill={node.status === 'offline' ? '#F7F7F7' : roleColors[node.role]}
              stroke={isSelected ? roleColors[node.role] : node.status === 'offline' ? '#DADADA' : 'white'}
              strokeWidth={isSelected ? 3 : 2}
              opacity={node.status === 'offline' ? 0.5 : 1}
            />

            {/* Role icon */}
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={compact ? 10 : 12}
              fill={node.status === 'offline' ? '#999' : 'white'}
            >
              {roleIcons[node.role]}
            </text>

            {/* Status indicator */}
            {node.status === 'degraded' && (
              <circle
                cx={node.x + radius - 3}
                cy={node.y - radius + 3}
                r={4}
                fill="#D4920A"
                stroke="white"
                strokeWidth="1.5"
              />
            )}
            {node.status === 'offline' && (
              <circle
                cx={node.x + radius - 3}
                cy={node.y - radius + 3}
                r={4}
                fill="#E85D3F"
                stroke="white"
                strokeWidth="1.5"
              />
            )}

            {/* Label */}
            <text
              x={node.x}
              y={node.y + radius + (compact ? 12 : 16)}
              textAnchor="middle"
              fontSize={compact ? 9 : 11}
              fontWeight="600"
              fill="#111"
            >
              {node.id}
            </text>
            {!compact && (
              <text
                x={node.x}
                y={node.y + radius + 30}
                textAnchor="middle"
                fontSize="10"
                fill="#777"
              >
                {node.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      {!compact && (
        <g transform={`translate(${width - 140}, ${height - 100})`}>
          <rect x="-10" y="-10" width="150" height="100" rx="8" fill="white" stroke="#DADADA" strokeWidth="0.5" opacity="0.9" />
          {Object.entries(roleColors).map(([role, color], i) => (
            <g key={role} transform={`translate(0, ${i * 20})`}>
              <circle cx="8" cy="8" r="5" fill={color} />
              <text x="20" y="12" fontSize="10" fill="#555" style={{ textTransform: 'capitalize' }}>{role}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
