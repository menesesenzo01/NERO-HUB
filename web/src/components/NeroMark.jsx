import { asset } from '../api.js';

/** Logo do Nero Hub num quadradinho com contorno, como no design. */
export default function NeroMark({ size = 36, className = '' }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative block shrink-0 overflow-hidden rounded-[12px] border-[2.5px] border-ink bg-hub ${className}`}
    >
      {/* o PNG tem cantos transparentes; ampliado um pouco ele preenche o quadrado */}
      <img src={asset('/nero-hub-logo.png')} alt="Nero Hub" className="absolute inset-0 h-full w-full scale-[1.12] object-cover" />
    </span>
  );
}
