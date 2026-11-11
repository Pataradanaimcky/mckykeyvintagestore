# Brand profile kit

One name, one picture and one description everywhere, so people recognise the store on any platform.

## Name and handle

| Item | Use |
|---|---|
| Display name | **Mcky Vintage Key** |
| Handle | `mckyvintagekey` on every platform (check it is free on each before you commit; fall back to `mckyvintagekey.store`) |
| Website | https://mckykeyvintagestore.vercel.app |
| Colors | Black `#08080A`, blue `#2456FF`, red `#E0263F`, white `#F4F4F6` |
| Typeface | Anuphan |

## Pictures

All files are in `public/brand/`.

| File | Size | Use for |
|---|---|---|
| `profile-1080.png` | 1080 × 1080 | Profile picture on Instagram, TikTok, Facebook, YouTube, LINE and your Google account (Gmail). Upload this one everywhere; each platform shrinks it. |
| `profile-400.png` | 400 × 400 | X (Twitter), or anywhere that rejects a large file |
| `profile.svg` | vector | Printing, or making other sizes |
| `cover-1500x500.png` | 1500 × 500 | X header. Other platforms use different cover shapes, so make those when you need them. |

The mark sits inside the middle of the square, so circular crops never cut it. It was checked at 200, 48 and 24 pixels wide.

The website uses the same mark for its browser icon (`src/app/icon.svg`), its phone home-screen icon (`src/app/apple-icon.png`) and the preview image that appears when the link is shared (`src/app/opengraph-image.png`, 1200 × 630).

## Bio text

Thai first, because the buyers are Thai. Character counts are for the Thai text as written.

**Instagram** (limit 150, this is 124)

```
แพ็กเสียงไทยป๊อป & ซิตี้ป๊อป พร้อมขึ้นเวที 🎹
สำหรับ Yamaha MODX M · Roland FANTOM-0
ทำโดยนักคีย์บอร์ดแบ็กอัพ
👇 ดูแพ็กทั้งหมด
```

**TikTok** (limit 80, this is 55)

```
แพ็กเสียงไทยป๊อป & ซิตี้ป๊อป สำหรับ MODX M / FANTOM-0 🎹
```

**X** (limit 160, this is 118)

```
แพ็กเสียงไทยป๊อปและซิตี้ป๊อปสำหรับนักคีย์บอร์ดเล่นสด ใช้กับ Yamaha MODX M และ Roland FANTOM-0 ทำโดยนักคีย์บอร์ดแบ็กอัพ
```

**Facebook page "About", YouTube channel description, LINE Official Account**

```
Mcky Vintage Key ทำแพ็กเสียงไทยป๊อปและซิตี้ป๊อปสำหรับนักคีย์บอร์ดเล่นสด
ทุกเสียงตั้งค่าสำหรับใช้บนเวทีไว้แล้ว โหลดลงเครื่องแล้วเล่นได้เลย

ใช้กับ: Yamaha MODX M / MONTAGE M และ Roland FANTOM-0
ดูแพ็กทั้งหมด: https://mckykeyvintagestore.vercel.app

ร้านนี้เป็นผู้ผลิตเสียงอิสระ ไม่ได้เป็นตัวแทนและไม่ได้รับการรับรองจาก Yamaha หรือ Roland
```

**English, for any platform**

```
Thai pop & city pop sound packs, stage-ready 🎹
For Yamaha MODX M · Roland FANTOM-0
Made by a working session keyboardist
```

## Gmail

| Setting | Value |
|---|---|
| Account name (what people see as the sender) | Mcky Vintage Key |
| Address | Something short that matches the handle, for example `mckyvintagekey@gmail.com` if it is free |
| Profile picture | `profile-1080.png`, set on the Google account |

Signature:

```
Mcky Vintage Key
แพ็กเสียงสำหรับนักคีย์บอร์ดเล่นสด · MODX M · FANTOM-0
https://mckykeyvintagestore.vercel.app
```

## Rules to keep

- Use the picture as it is. Do not stretch it, recolor it or put text on it.
- Maker and model names (Yamaha, MODX M, Roland, FANTOM-0) appear only as plain text that says what the packs work with. Never use their logos or product photos in a profile picture, cover or post template.
- Keep the "independent maker" line wherever there is room for it.
- When the store gets its own domain, replace the website address here, in `src/config/site.ts` and in every bio.
