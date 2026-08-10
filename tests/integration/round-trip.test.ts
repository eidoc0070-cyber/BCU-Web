import { beforeAll, describe, expect, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// ─────────────────────────────────────────────────────────────────────────────
// @java: common.util.anim.MaAnim / MaModel
// Mock serializers/parsers that mirror Rust's to_parity_string() format exactly.
// Format validated against crates/bcu-parser/src/maanim.rs and mamodel.rs.
// ─────────────────────────────────────────────────────────────────────────────

interface AnimPart {
  ints: [number, number, number, number, number];
  name: string;
  moves: [number, number, number, number][];
}

interface MaAnimData {
  parts: AnimPart[];
}

interface ModelPart {
  data: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  name: string;
}

interface MaModelData {
  parts: ModelPart[];
  ints: [number, number, number];
  confs: [number, number, number, number, number, number][];
  confNames: string[];
}

// ── MaAnim Serializer (mirrors MaAnim::to_parity_string) ─────────────────────
function serializeMaAnim(anim: MaAnimData): string {
  let out = '[maanim]\n3\n';
  out += `${anim.parts.length}\n`;
  for (const p of anim.parts) {
    out += `${p.ints.join(',')},${p.name}\n`;
    out += `${p.moves.length}\n`;
    for (const m of p.moves) {
      out += `${m.join(',')},\n`;
    }
  }
  return out;
}

// ── MaAnim Parser (mirrors parse_maanim) ─────────────────────────────────────
function parseMaAnim(text: string): MaAnimData {
  const lines = text.split('\n').map((l) => l.trim());
  if (lines[0] !== '[maanim]') throw new Error(`Invalid header: ${lines[0]}`);
  const n = parseInt(lines[2] ?? '', 10);
  if (Number.isNaN(n)) throw new Error('Invalid part count');

  const parts: AnimPart[] = [];
  let i = 3;
  for (let p = 0; p < n; p++) {
    const intLine = lines[i++];
    if (intLine === undefined || intLine === '')
      throw new Error(`Missing ints line at part ${p}`);
    const tokens = intLine.split(',');
    if (tokens.length < 5) throw new Error(`Ints line too short at part ${p}`);
    const ints: AnimPart['ints'] = [
      parseInt(tokens[0] ?? '0', 10),
      parseInt(tokens[1] ?? '0', 10),
      parseInt(tokens[2] ?? '0', 10),
      parseInt(tokens[3] ?? '0', 10),
      parseInt(tokens[4] ?? '0', 10),
    ];
    const name = tokens[5] ?? '';

    const moveCountLine = lines[i++];
    if (moveCountLine === undefined)
      throw new Error(`Missing move count at part ${p}`);
    const moveCount = parseInt(moveCountLine, 10);
    if (Number.isNaN(moveCount))
      throw new Error(`Invalid move count at part ${p}`);

    const moves: AnimPart['moves'] = [];
    for (let k = 0; k < moveCount; k++) {
      const moveLine = lines[i++];
      if (moveLine === undefined)
        throw new Error(`Missing move line at part ${p}, index ${k}`);
      const ms = moveLine.split(',');
      if (ms.length < 4)
        throw new Error(`Move line too short at part ${p}, index ${k}`);
      moves.push([
        parseInt(ms[0] ?? '0', 10),
        parseInt(ms[1] ?? '0', 10),
        parseInt(ms[2] ?? '0', 10),
        parseInt(ms[3] ?? '0', 10),
      ]);
    }
    parts.push({ ints, name, moves });
  }
  return { parts };
}

// ── MaModel Serializer (mirrors MaModel::to_parity_string) ───────────────────
function serializeMaModel(model: MaModelData): string {
  let out = '[mamodel]\n3\n';
  out += `${model.parts.length}\n`;
  for (const p of model.parts) {
    out += `${p.data.slice(0, 13).join(',')},${p.name}\n`;
  }
  out += `${model.ints.join(',')}\n`;
  out += `${model.confs.length}\n`;
  for (let i = 0; i < model.confs.length; i++) {
    out += `${model.confs[i].join(',')},${model.confNames[i] ?? ''}\n`;
  }
  return out;
}

// ── MaModel Parser (mirrors parse_mamodel) ───────────────────────────────────
function parseMaModel(text: string): MaModelData {
  const lines = text.split('\n').map((l) => l.trim());
  if (lines[0] !== '[mamodel]') throw new Error(`Invalid header: ${lines[0]}`);
  const n = parseInt(lines[2] ?? '', 10);
  if (Number.isNaN(n)) throw new Error('Invalid part count');

  const parts: ModelPart[] = [];
  let i = 3;
  for (let p = 0; p < n; p++) {
    const line = lines[i++];
    if (line === undefined || line === '')
      throw new Error(`Missing part line at ${p}`);
    const tokens = line.split(',');
    if (tokens.length < 13)
      throw new Error(`Part line too short at ${p}: ${line}`);
    const data: ModelPart['data'] = [
      parseInt(tokens[0] ?? '0', 10),
      parseInt(tokens[1] ?? '0', 10),
      parseInt(tokens[2] ?? '0', 10),
      parseInt(tokens[3] ?? '0', 10),
      parseInt(tokens[4] ?? '0', 10),
      parseInt(tokens[5] ?? '0', 10),
      parseInt(tokens[6] ?? '0', 10),
      parseInt(tokens[7] ?? '0', 10),
      parseInt(tokens[8] ?? '0', 10),
      parseInt(tokens[9] ?? '0', 10),
      parseInt(tokens[10] ?? '0', 10),
      parseInt(tokens[11] ?? '0', 10),
      parseInt(tokens[12] ?? '0', 10),
      0,
    ];
    parts.push({ data, name: tokens[13] ?? '' });
  }

  const intsLine = lines[i++];
  if (intsLine === undefined) throw new Error('Missing ints config line');
  const intsTokens = intsLine.split(',');
  if (intsTokens.length < 3) throw new Error('Ints config line too short');
  const ints: MaModelData['ints'] = [
    parseInt(intsTokens[0] ?? '0', 10),
    parseInt(intsTokens[1] ?? '0', 10),
    parseInt(intsTokens[2] ?? '0', 10),
  ];

  const mLine = lines[i++];
  if (mLine === undefined) throw new Error('Missing collision count');
  const m = parseInt(mLine, 10);
  if (Number.isNaN(m)) throw new Error('Invalid collision count');

  const confs: MaModelData['confs'] = [];
  const confNames: string[] = [];
  for (let c = 0; c < m; c++) {
    const line = lines[i++];
    if (line === undefined) throw new Error(`Missing collision line at ${c}`);
    const tokens = line.split(',');
    if (tokens.length < 6) throw new Error(`Collision line too short at ${c}`);
    confs.push([
      parseInt(tokens[0] ?? '0', 10),
      parseInt(tokens[1] ?? '0', 10),
      parseInt(tokens[2] ?? '0', 10),
      parseInt(tokens[3] ?? '0', 10),
      parseInt(tokens[4] ?? '0', 10),
      parseInt(tokens[5] ?? '0', 10),
    ]);
    confNames.push(tokens[6] ?? '');
  }

  return { parts, ints, confs, confNames };
}

// ── Helper Factories ─────────────────────────────────────────────────────────

function makeModelPart(parentIdx: number, name: string): ModelPart {
  return {
    data: [parentIdx, -1, 0, 0, 0, 0, 0, 0, 1000, 1000, 0, 1000, 0, 0],
    name,
  };
}

function makeAnimPart(frames: number[], interpType = 1, name = ''): AnimPart {
  return {
    ints: [1, interpType, -1, -1000, 1000],
    name,
    moves: frames.map((f, idx) => [f, idx * 10, interpType, 0]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Project Round-trip Integrity Tests', () => {
  beforeAll(() => {
    try {
      GlobalRegistrator.register();
    } catch (_e) {}
  });

  // ── BASELINE (existing) ───────────────────────────────────────────────────

  test('[baseline] MaAnim keyframe data survives full round-trip', () => {
    const original: MaAnimData = {
      parts: [
        {
          ints: [1, 1, -1, -1000, 1000],
          name: '',
          moves: [
            [0, 100, 1, 0],
            [10, 500, 2, 0],
          ],
        },
      ],
    };
    const serialized = serializeMaAnim(original);
    const reParsed = parseMaAnim(serialized);
    expect(reParsed.parts[0]?.ints).toEqual(original.parts[0]?.ints);
    expect(reParsed.parts[0]?.moves).toEqual(original.parts[0]?.moves);
    expect(serializeMaAnim(reParsed)).toBe(serialized);
  });

  test('[baseline] MaModel hierarchy preserved through serialization', () => {
    const original: MaModelData = {
      parts: [makeModelPart(-1, 'RootPart'), makeModelPart(0, 'ChildPart')],
      ints: [1000, 3600, 1000],
      confs: [],
      confNames: [],
    };
    const reParsed = parseMaModel(serializeMaModel(original));
    expect(reParsed.parts.length).toBe(2);
    expect(reParsed.parts[0]?.data[0]).toBe(-1);
    expect(reParsed.parts[1]?.data[0]).toBe(0);
  });

  // ── 1-A: Large-scale MaModel hierarchy ──────────────────────────────────

  describe('1-A: Large-scale MaModel hierarchy round-trip', () => {
    test('100-part flat hierarchy preserves all parent indices', () => {
      const parts: ModelPart[] = [makeModelPart(-1, 'Root')];
      for (let i = 1; i < 100; i++) parts.push(makeModelPart(0, `Part_${i}`));
      const model: MaModelData = {
        parts,
        ints: [1000, 3600, 1000],
        confs: [],
        confNames: [],
      };
      const reParsed = parseMaModel(serializeMaModel(model));
      expect(reParsed.parts.length).toBe(100);
      expect(reParsed.parts[0]?.data[0]).toBe(-1);
      for (let i = 1; i < 100; i++) expect(reParsed.parts[i]?.data[0]).toBe(0);
      expect(serializeMaModel(reParsed)).toBe(serializeMaModel(model));
    });

    test('5-level deep chain preserves exact parent-child indices', () => {
      const parts = [
        makeModelPart(-1, 'L0'),
        makeModelPart(0, 'L1'),
        makeModelPart(1, 'L2'),
        makeModelPart(2, 'L3'),
        makeModelPart(3, 'L4'),
      ];
      const reParsed = parseMaModel(
        serializeMaModel({
          parts,
          ints: [1000, 3600, 1000],
          confs: [],
          confNames: [],
        }),
      );
      for (let i = 0; i < 5; i++) {
        expect(reParsed.parts[i]?.data[0]).toBe(i === 0 ? -1 : i - 1);
        expect(reParsed.parts[i]?.name).toBe(`L${i}`);
      }
    });

    test('100 part names (strs0) order preserved', () => {
      const parts = Array.from({ length: 100 }, (_, i) =>
        makeModelPart(
          i === 0 ? -1 : Math.floor((i - 1) / 2),
          `Part_${i.toString().padStart(3, '0')}`,
        ),
      );
      const reParsed = parseMaModel(
        serializeMaModel({
          parts,
          ints: [1000, 0, 1000],
          confs: [],
          confNames: [],
        }),
      );
      for (let i = 0; i < 100; i++) {
        expect(reParsed.parts[i]?.name).toBe(
          `Part_${i.toString().padStart(3, '0')}`,
        );
      }
    });

    test('collision boxes (confs) preserved with names', () => {
      const model: MaModelData = {
        parts: [makeModelPart(-1, 'Root')],
        ints: [1000, 3600, 1000],
        confs: [
          [0, 0, 0, 0, 25, 0],
          [100, 200, -100, -200, 50, 1],
        ],
        confNames: ['HitBox', 'ShieldBox'],
      };
      const reParsed = parseMaModel(serializeMaModel(model));
      expect(reParsed.confs[0]).toEqual([0, 0, 0, 0, 25, 0]);
      expect(reParsed.confs[1]).toEqual([100, 200, -100, -200, 50, 1]);
      expect(reParsed.confNames[0]).toBe('HitBox');
      expect(reParsed.confNames[1]).toBe('ShieldBox');
    });
  });

  // ── 1-B: Extreme values & interpolation ─────────────────────────────────

  describe('1-B: MaAnim extreme value and interpolation round-trip', () => {
    test('FixedPoint boundary values (i32 min/max) survive round-trip', () => {
      const I32_MAX = 2_147_483_647;
      const I32_MIN = -2_147_483_648;
      const anim: MaAnimData = {
        parts: [
          {
            ints: [1, 1, -1, I32_MIN, I32_MAX],
            name: 'Extreme',
            moves: [
              [0, I32_MAX, 1, 0],
              [1, I32_MIN, 1, 0],
            ],
          },
        ],
      };
      const reParsed = parseMaAnim(serializeMaAnim(anim));
      expect(reParsed.parts[0]?.ints[3]).toBe(I32_MIN);
      expect(reParsed.parts[0]?.ints[4]).toBe(I32_MAX);
      expect(reParsed.parts[0]?.moves[0]?.[1]).toBe(I32_MAX);
      expect(reParsed.parts[0]?.moves[1]?.[1]).toBe(I32_MIN);
    });

    test('all interpolation types 0~4 preserved independently', () => {
      for (const interp of [0, 1, 2, 3, 4]) {
        const anim: MaAnimData = { parts: [makeAnimPart([0, 5, 10], interp)] };
        const reParsed = parseMaAnim(serializeMaAnim(anim));
        expect(reParsed.parts[0]?.moves.every((m) => m[2] === interp)).toBe(
          true,
        );
      }
    });

    test('part with 0 keyframes (empty moves) round-trips correctly', () => {
      const anim: MaAnimData = {
        parts: [
          { ints: [1, 1, -1, -1000, 1000], name: 'EmptyPart', moves: [] },
        ],
      };
      expect(parseMaAnim(serializeMaAnim(anim)).parts[0]?.moves.length).toBe(0);
    });

    test('part with exactly 1 keyframe round-trips correctly', () => {
      const anim: MaAnimData = {
        parts: [
          {
            ints: [1, 1, -1, -1000, 1000],
            name: 'Single',
            moves: [[0, 500, 1, 0]],
          },
        ],
      };
      const reParsed = parseMaAnim(serializeMaAnim(anim));
      expect(reParsed.parts[0]?.moves.length).toBe(1);
      expect(reParsed.parts[0]?.moves[0]).toEqual([0, 500, 1, 0]);
    });

    test('1000-keyframe part survives round-trip (spot-check first/mid/last)', () => {
      const frames = Array.from({ length: 1000 }, (_, i) => i);
      const anim: MaAnimData = {
        parts: [makeAnimPart(frames, 1, 'LargePart')],
      };
      const reParsed = parseMaAnim(serializeMaAnim(anim));
      expect(reParsed.parts[0]?.moves.length).toBe(1000);
      expect(reParsed.parts[0]?.moves[0]?.[0]).toBe(0);
      expect(reParsed.parts[0]?.moves[499]?.[0]).toBe(499);
      expect(reParsed.parts[0]?.moves[999]?.[0]).toBe(999);
    });

    test('multi-part MaAnim with mixed interpolation types preserves each part', () => {
      const anim: MaAnimData = {
        parts: [
          makeAnimPart([0, 10, 20], 1, 'Linear'),
          makeAnimPart([0, 5], 2, 'Hermite'),
          makeAnimPart([], 4, 'Step_Empty'),
        ],
      };
      const reParsed = parseMaAnim(serializeMaAnim(anim));
      expect(reParsed.parts.length).toBe(3);
      expect(reParsed.parts[0]?.moves.length).toBe(3);
      expect(reParsed.parts[1]?.moves.length).toBe(2);
      expect(reParsed.parts[2]?.moves.length).toBe(0);
      expect(reParsed.parts[0]?.name).toBe('Linear');
      expect(reParsed.parts[1]?.name).toBe('Hermite');
      expect(reParsed.parts[2]?.name).toBe('Step_Empty');
    });
  });

  // ── 1-C: Corrupted data defense ─────────────────────────────────────────

  describe('1-C: Corrupted data parsing defense', () => {
    test('MaAnim: missing [maanim] header throws', () => {
      expect(() => parseMaAnim('INVALID\n1\n0\n')).toThrow('Invalid header');
    });

    test('MaAnim: empty string throws', () => {
      expect(() => parseMaAnim('')).toThrow();
    });

    test('MaAnim: non-numeric part count throws', () => {
      expect(() => parseMaAnim('[maanim]\n3\nNaN\n')).toThrow();
    });

    test('MaAnim: declared move count exceeds actual lines throws', () => {
      const corrupt = '[maanim]\n3\n1\n1,1,-1,-1000,1000,\n3\n0,0,1,0,\n';
      expect(() => parseMaAnim(corrupt)).toThrow();
    });

    test('MaAnim: move line with <4 elements throws', () => {
      const corrupt = '[maanim]\n3\n1\n1,1,-1,-1000,1000,\n1\n0,0,\n';
      expect(() => parseMaAnim(corrupt)).toThrow();
    });

    test('MaModel: missing [mamodel] header throws', () => {
      expect(() => parseMaModel('INVALID\n3\n0\n')).toThrow('Invalid header');
    });

    test('MaModel: empty string throws', () => {
      expect(() => parseMaModel('')).toThrow();
    });

    test('MaModel: part line with <13 elements throws', () => {
      const corrupt = '[mamodel]\n3\n1\n-1,-1,0,0,0\n1000,3600,1000\n0\n';
      expect(() => parseMaModel(corrupt)).toThrow();
    });

    test('MaModel: invalid ints config line throws', () => {
      const corrupt =
        '[mamodel]\n3\n1\n-1,-1,0,0,0,0,0,0,1000,1000,0,1000,0,\nBAD\n0\n';
      expect(() => parseMaModel(corrupt)).toThrow();
    });
  });

  // ── 1-D: Double serialization idempotency ────────────────────────────────

  describe('1-D: Double serialization idempotency', () => {
    test('MaAnim: serialize(parse(serialize(data))) === serialize(data)', () => {
      const original: MaAnimData = {
        parts: [
          makeAnimPart([0, 10, 20, 30], 1, 'Walk'),
          makeAnimPart([0, 15], 2, 'Idle'),
          { ints: [1, 4, -1, -500, 500], name: 'StepOnly', moves: [] },
        ],
      };
      const s1 = serializeMaAnim(original);
      const s2 = serializeMaAnim(parseMaAnim(s1));
      const s3 = serializeMaAnim(parseMaAnim(s2));
      expect(s2).toBe(s1);
      expect(s3).toBe(s1);
    });

    test('MaModel: serialize(parse(serialize(data))) === serialize(data)', () => {
      const original: MaModelData = {
        parts: [
          makeModelPart(-1, 'Root'),
          makeModelPart(0, 'Body'),
          makeModelPart(1, 'Head'),
          makeModelPart(1, 'LeftArm'),
          makeModelPart(1, 'RightArm'),
        ],
        ints: [1000, 3600, 1000],
        confs: [[0, 0, 0, 0, 30, 0]],
        confNames: ['MainHitBox'],
      };
      const s1 = serializeMaModel(original);
      const s2 = serializeMaModel(parseMaModel(s1));
      const s3 = serializeMaModel(parseMaModel(s2));
      expect(s2).toBe(s1);
      expect(s3).toBe(s1);
    });

    test('MaAnim with i32 boundary values: triple-serialize idempotent', () => {
      const anim: MaAnimData = {
        parts: [
          {
            ints: [1, 1, -1, -2_147_483_648, 2_147_483_647],
            name: 'ExtremeIdempotent',
            moves: [
              [0, 2_147_483_647, 1, 0],
              [1, -2_147_483_648, 1, 0],
            ],
          },
        ],
      };
      const s1 = serializeMaAnim(anim);
      expect(serializeMaAnim(parseMaAnim(s1))).toBe(s1);
    });

    test('MaAnim with 0 parts: empty anim is idempotent', () => {
      const empty: MaAnimData = { parts: [] };
      const s1 = serializeMaAnim(empty);
      expect(parseMaAnim(s1).parts.length).toBe(0);
      expect(serializeMaAnim(parseMaAnim(s1))).toBe(s1);
    });
  });
});
