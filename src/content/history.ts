/**
 * /history: four makers, their instruments by era, famous patches and songs.
 * Every patch and song line has a source the researcher read (2026-11-16); nothing here is from
 * memory alone. Factory preset names are mentioned as history only — the store never ships them.
 * Photos are not stored here: `wiki` is the English Wikipedia article whose lead image is loaded
 * from Wikimedia Commons with its own author and licence (src/lib/history/commons.ts).
 */

export type Source = { label: string; url: string };

export type Song = { artist: string; title: string; note?: string; source: Source };

export type Patch = { name: string; note: string; source: Source };

export type Instrument = {
  model: string;
  year: string;
  /** English Wikipedia article for the photo, or null when no article shows this exact model. */
  wiki: string | null;
  blurb: string;
  patches?: Patch[];
  songs?: Song[];
  /** Set when the store sells packs for it. */
  packsHref?: string;
  source?: Source;
};

export type Era = { name: string; instruments: Instrument[] };

export type Brand = { id: string; name: string; since: string; intro: string; eras: Era[] };

const S = {
  bladeRunner: { label: "MusicRadar: Blade Runner Main Titles", url: "https://musicradar.com/news/blade-runner-best-synth-sound" },
  dx7Songs: { label: "Reverb Machine: Exploring the Yamaha DX7, Part Two: Songs", url: "https://reverbmachine.com/blog/exploring-the-yamaha-dx7-pt2/" },
  presets: { label: "MusicRadar: The 10 best synth presets ever used", url: "https://musicradar.com/news/best-synth-presets" },
  modxm: { label: "Yamaha: Yamaha Unveils MODX M Synthesizer (ต.ค. 2025)", url: "https://usa.yamaha.com/news_events/2025/yamaha-unveils-modx-m-synthesizer.html" },
  jupiter: { label: "Roland: Nick Rhodes on the Roland synths that drive Duran Duran", url: "https://www.roland.com/uk/blog/nick-rhodes-on-the-roland-synths-that-drive-duran-duran/" },
  takeOnMe: { label: "MusicRadar: The 40 greatest synth sounds, No 8: a-ha – Take On Me", url: "https://www.musicradar.com/how-to/the-40-greatest-synth-sounds-of-all-time-no-8-a-ha-take-on-me" },
  orinoco: { label: "MusicRadar: The 40 greatest synth sounds, No 37: Enya – Orinoco Flow", url: "https://musicradar.com/news/the-40-greatest-synth-sounds-of-all-time-no-37-enya-orinoco-flow" },
  fantom0: { label: "Roland: Roland Introduces FANTOM-0 Synthesizer Keyboard Series (2022)", url: "https://www.roland.com/us/company/press_releases/2022/Roland-Introduces-FANTOM-0-Synthesizer-Keyboard-Se/" },
  jump: { label: "Reverb: The Synth Sounds of Van Halen's \"Jump\"", url: "https://reverb.com/news/the-synth-sounds-of-van-halens-jump" },
  obx8: { label: "MusicRadar: Oberheim is back with the OB-X8 (Superbooth 2022)", url: "https://www.musicradar.com/news/oberheim-ob-x8-synth-launched" },
  carlos: { label: "Reverb: Just How Pioneering Was Wendy Carlos' \"Switched-On Bach\"?", url: "https://reverb.com/news/wendy-carlos-pioneering-moog-synthesis-switched-on-bach" },
  minimoog: { label: "Reverb: 10 Musicians Who Made the Minimoog the Most Influential Mono Synth", url: "https://reverb.com/news/10-musicians-who-made-the-minimoog-the-most-influential-synth-of-all-time" },
  moogOne: { label: "Reverb: Moog Releases Moog One, Its First Polyphonic Synth in Over 30 Years", url: "https://reverb.com/news/moog-releases-moog-one-its-first-polyphonic-synth-in-over-30-years" },
} satisfies Record<string, Source>;

export const brands: Brand[] = [
  {
    id: "yamaha",
    name: "Yamaha",
    since: "1887",
    intro:
      "เริ่มจากโทราคุสุ ยามาฮ่า ซ่อมและสร้างออร์แกนในญี่ปุ่น ต่อมาทำทั้งเปียโนและเครื่องดนตรีไฟฟ้า ซินธ์ของยามาฮ่าเปลี่ยนวงการสองครั้ง: อนาล็อกโพลีโฟนิกรุ่นใหญ่ในยุค 70 และเสียง FM ที่ครองเพลงป๊อปยุค 80",
    eras: [
      {
        name: "ยุคอนาล็อก",
        instruments: [
          {
            model: "CS-80",
            year: "1977",
            wiki: "Yamaha CS-80",
            blurb: "อนาล็อกโพลีโฟนิก 8 เสียง ตัวใหญ่และหนักมาก มีแถบริบบอนให้รูดเสียง และกดคีย์แรงขึ้นเพื่อเปลี่ยนเสียงได้ทีละโน้ต",
            songs: [{ artist: "Vangelis", title: "Blade Runner (Main Titles)", note: "เสียงหลักของซาวด์แทร็กเป็น CS-80", source: S.bladeRunner }],
          },
        ],
      },
      {
        name: "ยุค FM",
        instruments: [
          {
            model: "DX7",
            year: "1983",
            wiki: "Yamaha DX7",
            blurb: "ซินธ์ FM 6 operator ที่ขายดีจนเสียงของมันอยู่ในเพลงฮิตยุค 80 แทบทุกเพลง เก็บเสียงในเครื่อง 32 เสียงและเพิ่มได้ด้วยตลับ",
            patches: [
              { name: "E.PIANO 1", note: "เปียโนไฟฟ้าโรงงานที่ดังที่สุดของ DX7", source: S.dx7Songs },
              { name: "BASS 1", note: "เบสที่ใช้ใน Take On Me", source: S.dx7Songs },
            ],
            songs: [
              { artist: "Whitney Houston", title: "Greatest Love of All", note: "E.PIANO 1", source: S.dx7Songs },
              { artist: "Angelo Badalamenti", title: "Twin Peaks Theme", note: "E.PIANO 1", source: S.dx7Songs },
              { artist: "a-ha", title: "Take On Me", note: "BASS 1 และ SYN-LEAD 3", source: S.dx7Songs },
              { artist: "Queen", title: "Who Wants to Live Forever", note: "SYN-ORCH", source: S.dx7Songs },
            ],
            packsHref: "/#play-fm",
          },
          {
            model: "TX81Z",
            year: "1987",
            wiki: "Yamaha TX81Z",
            blurb: "โมดูล FM 4 operator แบบติดแร็ค ไม่มีคีย์บอร์ด เล็กและถูกกว่า DX7 มาก",
            patches: [{ name: "LatelyBass", note: "เบสโรงงานที่กลายเป็นเสียงประจำเพลงเฮาส์และป๊อป", source: S.presets }],
            songs: [{ artist: "Madonna", title: "Vogue", note: "LatelyBass", source: S.presets }],
          },
        ],
      },
      {
        name: "ยุคปัจจุบัน",
        instruments: [
          {
            model: "MODX M",
            year: "2025",
            wiki: null,
            blurb: "ซินธ์รุ่นกลางที่นำเอนจินของ MONTAGE M มาใส่ในตัวที่เบาและราคาถูกลง ร้านเรามีแพ็กเสียงของร้านเองสำหรับรุ่นนี้",
            packsHref: "/packs?inst=yamaha-modx-m",
            source: S.modxm,
          },
        ],
      },
    ],
  },
  {
    id: "roland",
    name: "Roland",
    since: "1972",
    intro:
      "อิคุทาโร่ คาเคฮาชิ ตั้งบริษัทที่โอซาก้า ซินธ์อนาล็อกของ Roland เป็นเสียงหลักของยุค 80 และเครื่องดิจิทัลอย่าง D-50 ก็พาเสียงแบบใหม่เข้าสู่เพลงป๊อป",
    eras: [
      {
        name: "ยุคอนาล็อก",
        instruments: [
          {
            model: "Jupiter-8",
            year: "1981",
            wiki: "Roland Jupiter-8",
            blurb: "อนาล็อกโพลีโฟนิก 8 เสียง รุ่นเรือธงของ Roland ในยุคนั้น",
            songs: [{ artist: "Duran Duran", title: "เล่นบนเวทีทัวร์สเตเดียม", note: "Nick Rhodes พาไปทุกทัวร์ (ไม่ได้ระบุเพลง)", source: S.jupiter }],
          },
          {
            model: "Juno-60",
            year: "1982",
            wiki: "Roland Juno-60",
            blurb: "อนาล็อก 6 เสียง ราคาจับต้องได้ เสียงคอรัสในตัวคือเอกลักษณ์",
            songs: [{ artist: "a-ha", title: "Take On Me", note: "ริฟฟ์หลักของเพลง", source: S.takeOnMe }],
          },
        ],
      },
      {
        name: "ยุคดิจิทัล",
        instruments: [
          {
            model: "D-50",
            year: "1987",
            wiki: "Roland D-50",
            blurb: "ใช้วิธี LA คือเอาเสียงจังหวะเริ่มที่อัดจากของจริงมาต่อกับเสียงซินธ์ ได้เสียงที่ทั้งสมจริงและฟุ้ง",
            patches: [{ name: "Digital Native Dance", note: "เสียงโรงงานที่คนจำได้ทันที", source: S.presets }],
            songs: [{ artist: "Enya", title: "Orinoco Flow", note: "คอร์ดพิซซิคาโต (ไม่ได้ระบุชื่อเสียง)", source: S.orinoco }],
          },
        ],
      },
      {
        name: "ยุคปัจจุบัน",
        instruments: [
          {
            model: "FANTOM-0 (06 / 07 / 08)",
            year: "2022",
            wiki: null,
            blurb: "เวิร์กสเตชันที่ยกเอนจินของ FANTOM มาในตัวที่เบาและราคาถูกลง ร้านเรามีแพ็กเสียงของร้านเองสำหรับรุ่นนี้",
            packsHref: "/packs?inst=roland-fantom-0",
            source: S.fantom0,
          },
        ],
      },
    ],
  },
  {
    id: "oberheim",
    name: "Oberheim",
    since: "1969",
    intro:
      "ทอม โอเบอร์ไฮม์ เริ่มจากทำเอฟเฟกต์และโมดูลเสริม แล้วกลายเป็นชื่อของเสียงแบรสหนาๆ ในเพลงร็อกและป๊อปยุค 80",
    eras: [
      {
        name: "ยุคโมดูล",
        instruments: [
          {
            model: "SEM",
            year: "1974",
            wiki: "Oberheim SEM",
            blurb: "Synthesizer Expander Module ซินธ์เสียงเดียวแบบกล่อง ต่อหลายตัวรวมกันเป็นเครื่องโพลีโฟนิก (Two Voice, Four Voice)",
          },
        ],
      },
      {
        name: "ยุค OB",
        instruments: [
          {
            model: "OB-X / OB-Xa",
            year: "1979 / 1980",
            wiki: "Oberheim OB-Xa",
            blurb: "อนาล็อกโพลีโฟนิกที่เสียงแบรสหนาแน่นเป็นเอกลักษณ์",
            songs: [{ artist: "Van Halen", title: "Jump", note: "แหล่งข้อมูลระบุต่างกันว่าอัดด้วย OB-X หรือ OB-Xa", source: S.jump }],
          },
        ],
      },
      {
        name: "ยุคปัจจุบัน",
        instruments: [
          {
            model: "OB-X8",
            year: "2022",
            wiki: "Oberheim OB-X8",
            blurb: "อนาล็อก 8 เสียงที่ทอม โอเบอร์ไฮม์ทำขึ้นใหม่ รวมเสียงของรุ่น OB ยุค 80 ไว้ในเครื่องเดียว",
            source: S.obx8,
          },
        ],
      },
    ],
  },
  {
    id: "moog",
    name: "Moog",
    since: "1953",
    intro:
      "โรเบิร์ต มูก เริ่มจากขายชุดประกอบเทอร์มิน แล้วสร้างซินธ์โมดูลาร์ที่ทำให้คนทั่วไปได้ยินเสียงซินธ์เป็นครั้งแรก ฟิลเตอร์ของ Moog ยังเป็นเสียงอ้างอิงจนถึงทุกวันนี้",
    eras: [
      {
        name: "ยุคโมดูลาร์",
        instruments: [
          {
            model: "Moog modular",
            year: "1960s",
            wiki: "Moog synthesizer",
            blurb: "ตู้โมดูลที่ต้องต่อสายเองทุกเส้น เหมือนหน้า MODULAR ในแร็คของเรา",
            songs: [{ artist: "Wendy Carlos", title: "Switched-On Bach (1968)", note: "อัลบั้มเพลงบาคที่เล่นด้วย Moog modular ทั้งหมด", source: S.carlos }],
          },
        ],
      },
      {
        name: "ยุคพกพา",
        instruments: [
          {
            model: "Minimoog Model D",
            year: "1970",
            wiki: "Minimoog",
            blurb: "ย่อโมดูลาร์ให้เป็นเครื่องเดียวไม่ต้องต่อสาย เบสและลีดของมันคือต้นแบบของซินธ์เสียงเดียว",
            songs: [
              { artist: "Parliament", title: "Flash Light", note: "เบสของ Bernie Worrell", source: S.minimoog },
              { artist: "Kraftwerk", title: "Autobahn", source: S.minimoog },
              { artist: "Gary Numan", title: "Cars", source: S.minimoog },
            ],
          },
          {
            model: "Polymoog",
            year: "1975",
            wiki: "Polymoog",
            blurb: "Moog ที่เล่นได้ทุกคีย์พร้อมกัน มีเสียงสำเร็จรูปให้กดเลือก",
            patches: [{ name: "Vox Humana", note: "เสียงสำเร็จรูปที่ดังที่สุดของเครื่อง", source: S.presets }],
            songs: [{ artist: "Gary Numan", title: "Cars", note: "Vox Humana", source: S.presets }],
          },
        ],
      },
      {
        name: "ยุคปัจจุบัน",
        instruments: [
          {
            model: "Moog One",
            year: "2018",
            wiki: "Moog One",
            blurb: "อนาล็อกโพลีโฟนิกรุ่นแรกของ Moog ในรอบกว่า 30 ปี",
            source: S.moogOne,
          },
        ],
      },
    ],
  },
];

/** Every article title that has a photo, in page order (one API request covers them all). */
export const photoTitles = brands.flatMap((b) => b.eras.flatMap((e) => e.instruments.map((i) => i.wiki))).filter((t): t is string => !!t);
