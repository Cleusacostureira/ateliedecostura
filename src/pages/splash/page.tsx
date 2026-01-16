/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCompanyLogo } from '../../lib/useCompanyLogo';

export default function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function decide() {
      // default: show full animation then go to login
      let totalMs = 5200;
      let target = '/login';

      try {
        const { data } = await supabase.auth.getSession();
        const session = (data as any)?.session;
        if (session) {
          // if user is logged in, shorten animation to finish strokes and go to dashboard
          totalMs = 3800; // finish stroke animation but before name reveal
          target = '/dashboard';
        }
      } catch {
        // ignore and use defaults
      }

      if (!mounted) return;
      const t = setTimeout(() => navigate(target), totalMs + 200);
      return () => clearTimeout(t);
    }

    const maybeCleanup = decide();
    return () => {
      mounted = false;
      if (maybeCleanup && typeof maybeCleanup.then === 'function') {
        maybeCleanup.then((fn: any) => fn && fn());
      }
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F3]">
      <div className="flex flex-col items-center">
        <svg
          width="320"
          height="160"
          viewBox="0 0 640 320"
          xmlns="http://www.w3.org/2000/svg"
          className="max-w-full h-auto"
        >
          <defs>
            <style>{`
              /* Ajuste de cor: tom vermelho escuro / quase roxo (mesma paleta do logo) */
              .stitch { fill: none; stroke: #6D114F; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
              .needle { fill: #6D114F; }
              .name { fill: none; stroke: #6D114F; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
              .label { fill: #6D114F; font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; font-weight:600 }

              /* draw animation - extended durations */
              .path-anim { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw 3.6s linear forwards; }
              .needle-anim { transform-origin: 0 0; animation: needle-move 3.6s linear forwards; }
              .name-anim { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw 3.8s linear forwards 0.6s; }
              .label-fade { opacity: 0; animation: fadeIn 0.6s ease forwards 3.6s; }
              .glow { filter: drop-shadow(0 0 6px rgba(109,17,79,0.12)); }

              @keyframes draw { to { stroke-dashoffset: 0; } }
              @keyframes needle-move { to { transform: translateX(30px) translateY(8px) rotate(6deg); } }
              @keyframes fadeIn { to { opacity: 1; } }
            `}</style>
          </defs>

          {/* stitching line */}
          <path
            className="stitch path-anim"
            d="M60 160 C140 40, 260 40, 340 160 C420 280, 540 280, 620 160"
          />

          {/* needle */}
          <g className="needle-anim">
            <ellipse className="needle" cx="52" cy="152" rx="8" ry="18" />
            <rect x="48" y="170" width="8" height="18" rx="2" fill="#C8A15A" />
          </g>

          {/* stylized name drawn by stroke */}
          <g transform="translate(80,80) scale(1.5)">
            <path
              className="name name-anim glow"
              d="M10 60 C30 10, 90 0, 120 40 C150 80, 210 90, 250 50"
            />
            {/* moved down to avoid overlapping the stitch */}
            <text x="8" y="130" className="label label-fade" fontSize="28">Ateliê de Costura</text>
          </g>
        </svg>
        {/* reveal company name/logo after animation */}
        <style>{`
          .company-reveal { opacity: 0; transform: scale(0.86); transition: none; animation: reveal 0.6s ease forwards 4.6s; }
          @keyframes reveal { to { opacity: 1; transform: scale(1); } }
        `}</style>

        <SplashLogo />
      </div>
    </div>
  );
}

function SplashLogo() {
  const logo = useCompanyLogo();
  const src = logo || '/assets/cleusa-logo.svg';
  return (
    <div className="company-reveal mt-6 text-center">
      <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#6D114F]">Cleusa</div>
      <div className="text-sm md:text-base text-[#6D114F] mt-0">Ateliê de Costura</div>
    </div>
  );
}
