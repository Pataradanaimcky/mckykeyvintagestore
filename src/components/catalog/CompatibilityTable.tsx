const rows = [
  { model: "MODX M6 / M7 / M8", ok: true, note: "โหลดเป็น Library ได้เลย" },
  { model: "MONTAGE M6 / M7 / M8x", ok: true, note: "โหลดเป็น Library ได้เลย" },
  { model: "ปลั๊กอิน ESP", ok: true, note: "เปิดบนคอมพิวเตอร์" },
  { model: "MODX / MODX+ รุ่นเดิม", ok: false, note: "ไฟล์คนละรูปแบบ (.X8L)" },
];

export function CompatibilityTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">รุ่น</th>
            <th className="px-4 py-3 font-medium">ใช้ได้ไหม</th>
            <th className="px-4 py-3 font-medium">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.model} className="border-t border-line">
              <td className="px-4 py-3">{row.model}</td>
              <td className={`px-4 py-3 font-semibold ${row.ok ? "text-ok" : "text-sale"}`}>
                {row.ok ? "ใช้ได้" : "ใช้ไม่ได้"}
              </td>
              <td className="px-4 py-3 text-muted">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
