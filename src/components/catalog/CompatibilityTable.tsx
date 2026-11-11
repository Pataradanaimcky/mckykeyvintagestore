import type { Instrument } from "@/lib/catalog";

export function CompatibilityTable({ instrument }: { instrument: Instrument }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line">
      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
        <caption className="border-b border-line bg-surface px-5 py-4 text-left text-lg font-semibold">
          แพ็กสำหรับ {instrument.maker} {instrument.model} · ไฟล์ {instrument.fileFormat}
        </caption>
        <thead className="bg-surface text-xs uppercase text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">รุ่น</th>
            <th className="px-5 py-3 font-medium">ใช้ได้ไหม</th>
            <th className="px-5 py-3 font-medium">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {instrument.compatibility.map((row) => (
            <tr key={row.model} className="border-t border-line">
              <td className="px-5 py-3">{row.model}</td>
              <td className={`px-5 py-3 font-semibold ${row.ok ? "text-ok" : "text-sale"}`}>
                {row.ok ? "ใช้ได้" : "ใช้ไม่ได้"}
              </td>
              <td className="px-5 py-3 text-muted">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
