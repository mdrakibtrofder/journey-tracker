'use client';

import { useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { NetworkPayload } from '@/lib/api';
import { CHART_COLORS } from '@/lib/utils';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as unknown as ComponentType<any>;

const colorFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CHART_COLORS[hash % CHART_COLORS.length];
};

/**
 * Station connectivity network. Node size = journeys at that station,
 * link width = journeys on that route.
 */
export default function NetworkGraph({ payload }: { payload: NetworkPayload }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const graphData = useMemo(() => {
    const nodes = payload.nodes
      .filter((n) => n.journeys > 0)
      .map((n) => ({ id: n.id, val: n.journeys, fare: n.fare }));
    const known = new Set(nodes.map((n) => n.id));
    const links = payload.links
      .filter((l) => known.has(l.source) && known.has(l.target) && l.journeys > 0)
      .map((l) => ({ source: l.source, target: l.target, value: l.journeys, route: l.route }));
    return { nodes, links };
  }, [payload]);

  if (!graphData.nodes.length) {
    return <p className="grid h-full place-items-center text-sm text-ink-400">Not enough station data yet</p>;
  }

  return (
    <div ref={wrapRef} className="h-full w-full">
      <ForceGraph2D
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={140}
        d3VelocityDecay={0.32}
        linkColor={() => 'rgba(148,163,184,0.5)'}
        linkWidth={(l: any) => Math.min(6, 0.6 + Math.sqrt(l.value))}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.92}
        linkLabel={(l: any) => `${l.route}: ${l.value} journeys`}
        nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
          const r = 4 + Math.sqrt(node.val) * 1.7;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = colorFor(node.id);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          const label = String(node.id);
          const fontSize = 11 / globalScale;
          ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#475569';
          ctx.fillText(label, node.x, node.y + r + 1.5);
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: any) => {
          const r = 4 + Math.sqrt(node.val) * 1.7;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />
    </div>
  );
}
