import Link from "next/link";
import type { Metadata } from "next";
import { HistoryPhoto, HistoryPhotos } from "@/components/history/HistoryPhotos";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { brands, photoTitles, type Instrument, type Source } from "@/content/history";

export const metadata: Metadata = {
  title: "ประวัติซินธ์",
  description: "ประวัติของ Yamaha, Roland, Oberheim และ Moog คีย์บอร์ดแต่ละยุค เสียงที่ดัง และเพลงที่ใช้",
};

function SourceLink({ source }: { source: Source }) {
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="history-src">
      แหล่งข้อมูล
    </a>
  );
}

function InstrumentCard({ item }: { item: Instrument }) {
  return (
    <article className="history-card" data-reveal>
      <HistoryPhoto title={item.wiki} model={item.model} />
      <div className="flex flex-col gap-3 p-4">
        <header className="flex items-baseline justify-between gap-3">
          <h4 className="text-xl font-bold tracking-tight">{item.model}</h4>
          <span className="font-mono text-sm text-muted tabular-nums">{item.year}</span>
        </header>
        <p className="text-sm text-muted">
          {item.blurb} {item.source && <SourceLink source={item.source} />}
        </p>

        {item.patches && (
          <div className="flex flex-col gap-1.5">
            <p className="history-label">เสียงที่ดัง</p>
            <ul className="flex flex-col gap-1 text-sm">
              {item.patches.map((p) => (
                <li key={p.name}>
                  <span className="history-patch">{p.name}</span> {p.note} <SourceLink source={p.source} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.songs && (
          <div className="flex flex-col gap-1.5">
            <p className="history-label">เพลงที่ใช้</p>
            <ul className="flex flex-col gap-1 text-sm">
              {item.songs.map((s) => (
                <li key={`${s.artist}-${s.title}`}>
                  <b>{s.artist}</b> – {s.title}
                  {s.note && <span className="text-muted"> · {s.note}</span>} <SourceLink source={s.source} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.packsHref && (
          <Link href={item.packsHref} className="history-cta">
            {item.packsHref.startsWith("/#") ? "▶ ลองเล่นเสียง FM ในแร็คของเรา" : "ดูแพ็กเสียงของร้านสำหรับรุ่นนี้ →"}
          </Link>
        )}
      </div>
    </article>
  );
}

export default function HistoryPage() {
  return (
    <Container className="flex flex-col gap-10 pb-10">
      <PageHeader title="ประวัติซินธ์">
        สี่ยี่ห้อที่สร้างเสียงคีย์บอร์ดที่เราได้ยินในเพลง: คีย์บอร์ดของแต่ละยุค เสียงที่ดัง และเพลงที่ใช้
      </PageHeader>

      <aside className="history-note" aria-label="เกี่ยวกับหน้านี้">
        <p>
          <b>หน้านี้ทำเพื่อการเรียนรู้ ไม่ใช่สินค้า</b> สิ่งที่ร้านขายมีแค่แพ็กเสียงที่ร้านทำเองเท่านั้น
          ร้านไม่ได้ขาย ไม่ได้แจก และไม่ได้มีเสียงโรงงานของเครื่องใดๆ ชื่อเสียงโรงงานที่ปรากฏเป็นเพียงข้อมูลประวัติ
        </p>
        <p>
          ภาพทุกภาพโหลดตรงจาก Wikimedia Commons ภายใต้สัญญาอนุญาตเสรีของผู้ถ่ายแต่ละคน (ไม่ใช่ภาพของร้าน)
          ชื่อผู้ถ่ายและสัญญาอนุญาตอยู่ใต้ภาพ กดเพื่อดูรายละเอียด ข้อมูลเพลงและเสียงมาจากบทความที่ลิงก์ไว้ในแต่ละบรรทัด
        </p>
        <p>
          Yamaha, Roland, Oberheim และ Moog เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย ร้านไม่ได้เกี่ยวข้องหรือได้รับการรับรองจากบริษัทเหล่านี้
        </p>
      </aside>

      <nav aria-label="ยี่ห้อ" className="flex flex-wrap gap-2">
        {brands.map((b) => (
          <a key={b.id} href={`#${b.id}`} className="history-jump">
            {b.name}
          </a>
        ))}
      </nav>

      <HistoryPhotos titles={photoTitles}>
        {brands.map((brand) => (
          <section key={brand.id} id={brand.id} className="flex scroll-mt-24 flex-col gap-6" aria-labelledby={`${brand.id}-h`}>
            <header className="flex flex-col gap-2 border-t-4 border-ink pt-4">
              <h2 id={`${brand.id}-h`} className="flex items-baseline gap-3 text-4xl font-black tracking-tight sm:text-5xl">
                {brand.name}
                <span className="font-mono text-sm font-normal text-muted">ตั้งแต่ {brand.since}</span>
              </h2>
              <p className="max-w-3xl text-muted">{brand.intro}</p>
            </header>

            {brand.eras.map((era) => (
              <div key={era.name} className="flex flex-col gap-3">
                <h3 className="history-era">{era.name}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {era.instruments.map((item) => (
                    <InstrumentCard key={item.model} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </HistoryPhotos>
    </Container>
  );
}
