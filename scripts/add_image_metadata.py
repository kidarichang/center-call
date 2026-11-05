#!/usr/bin/env python3
"""선불폰 개통 안내 이미지(WebP)에 EXIF + XMP 메타데이터를 삽입한다.

이미지 데이터는 재인코딩하지 않고 RIFF 청크(EXIF, XMP)만 추가하므로 화질 손실이 없다.
사용법: python3 scripts/add_image_metadata.py <원본폴더> <출력폴더>
"""
import struct
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image

BRAND = "투폰통신"
SITE = "투폰통신.com"
SITE_URL = "https://xn--zv4b74ygkak2d.com"  # 투폰통신.com (퓨니코드)
PHONE = "010-5110-0444"
COPYRIGHT = f"© 2026 {BRAND}. All rights reserved."
COMMON_KEYWORDS = ["선불폰", "선불폰 개통", "선불폰 개통 방법", "선불유심", "선불유심 개통",
                   "알뜰폰", "셀프개통", "유심 개통", "편의점 유심", BRAND, SITE]

IMAGES = [
    {
        "src": "1.webp",
        "out": "01-prepaid-phone-activation-guide.webp",
        "title": "선불폰 개통 방법 | 투폰통신",
        "headline": "선불폰 개통 방법",
        "description": "투폰통신 선불폰 개통 방법 안내. 편의점에서 선불유심을 구매한 뒤 "
                       "투폰통신.com 개통페이지에서 간편하게 셀프 개통할 수 있습니다.",
        "alt": "스마트폰을 들고 소파에 앉아 미소 짓는 여성과 '선불폰 개통 방법 투폰통신' 문구",
        "keywords": ["선불폰 개통 안내", "선불폰 만들기", "선불폰 개통 절차"],
    },
    {
        "src": "2.webp",
        "out": "02-lgu-onechip-usim-where-to-buy.webp",
        "title": "모두의 유심 원칩 구매처 (LG U+ 선불유심) | 투폰통신",
        "headline": "모두의 유심 원칩 구매처",
        "description": "LG U+ 알뜰폰·U+ 요금제를 개통할 수 있는 공용유심 '모두의 유심 원칩'. "
                       "이마트24, 스토리웨이, 배민 B마트에서 구매해 LG망 선불폰을 개통하세요.",
        "alt": "LG U+ 모두의 유심 원칩 패키지와 구매처 이마트24, 스토리웨이, 배민 B마트 안내",
        "keywords": ["원칩", "모두의 유심", "모두의유심 원칩", "LG U+ 유심", "LG망 선불폰",
                     "LG 선불유심", "U+ 알뜰폰", "공용유심", "이마트24 유심", "스토리웨이 유심",
                     "배민 B마트 유심"],
    },
    {
        "src": "3.webp",
        "out": "03-kt-baro-usim-where-to-buy.webp",
        "title": "KT 바로유심 구매처 (KT 선불유심) | 투폰통신",
        "headline": "KT 바로유심 구매처",
        "description": "KT 알뜰폰과 KT 요금제 모두 가입 가능한 'KT 바로유심'. "
                       "GS25, CU, 이마트24, 세븐일레븐 편의점에서 구매해 KT망 선불폰을 개통하세요.",
        "alt": "KT 바로유심 패키지와 구매처 GS25, CU, 이마트24, 세븐일레븐 안내",
        "keywords": ["바로유심", "KT 바로유심", "KT 유심", "KT망 선불폰", "KT 선불유심",
                     "KT 알뜰폰", "GS25 유심", "CU 유심", "이마트24 유심", "세븐일레븐 유심"],
    },
    {
        "src": "4.webp",
        "out": "04-activation-page-access.webp",
        "title": "투폰통신.com 선불폰 개통페이지 접속 방법 | 투폰통신",
        "headline": "주소창에 투폰통신.com 입력 후 개통페이지 접속",
        "description": "네이버, 구글, 크롬, 엣지 브라우저 주소창에 투폰통신.com을 입력하면 "
                       "선불폰 개통페이지로 바로 연결됩니다. 유심 준비 후 온라인으로 셀프 개통하세요.",
        "alt": "스마트폰 브라우저 주소창에 투폰통신.com을 입력해 개통페이지로 접속하는 방법 안내",
        "keywords": ["개통페이지", "선불폰 온라인 개통", "선불폰 셀프 개통", "투폰통신 홈페이지",
                     "투폰통신 개통페이지"],
    },
    {
        "src": "5.webp",
        "out": "05-twophone-contact-card.webp",
        "title": "투폰통신 온라인 명함 - 선불폰 개통 상담 | 투폰통신",
        "headline": "투폰통신 온라인 명함",
        "description": "선불폰 개통 상담은 투폰통신. 상담전화 010-5110-0444, 카카오톡 채널 '투폰통신', "
                       "태블릿번호 2939314, 홈페이지 투폰통신.com.",
        "alt": "투폰통신 온라인 명함: 상담전화 010 5110 0444, 카톡채널 투폰통신, 태블릿번호 2939314, 홈페이지 투폰통신.com",
        "keywords": ["투폰통신 연락처", "선불폰 개통 상담", "선불폰 상담전화", "투폰통신 카톡채널",
                     "010-5110-0444", "온라인 명함"],
    },
]


def utf16(s: str) -> bytes:
    """Windows XP* EXIF 태그용 UTF-16LE (null 종료)."""
    return (s + "\0").encode("utf-16-le")


def build_exif(m: dict, keywords: list) -> bytes:
    exif = Image.Exif()
    exif[0x010E] = m["description"].encode()        # ImageDescription
    exif[0x013B] = BRAND.encode()             # Artist
    exif[0x8298] = COPYRIGHT.encode()         # Copyright
    exif[0x0131] = BRAND.encode()             # Software
    exif[0x9C9B] = utf16(m["title"])         # XPTitle
    exif[0x9C9C] = utf16(m["description"])   # XPComment
    exif[0x9C9D] = utf16(BRAND)              # XPAuthor
    exif[0x9C9E] = utf16(";".join(keywords)) # XPKeywords
    exif[0x9C9F] = utf16(m["headline"])      # XPSubject
    return exif.tobytes()


def build_xmp(m: dict, keywords: list) -> bytes:
    e = lambda s: escape(s, {'"': "&quot;"})
    subjects = "\n".join(f"      <rdf:li>{e(k)}</rdf:li>" for k in keywords)
    xmp = f"""<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
    photoshop:Headline="{e(m['headline'])}"
    photoshop:Credit="{e(BRAND)}"
    photoshop:Source="{e(SITE)}"
    photoshop:Country="대한민국"
    xmp:CreatorTool="{e(BRAND)}"
    xmp:CreateDate="2026-11-05"
    xmpRights:Marked="True"
    xmpRights:WebStatement="{e(SITE_URL)}">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">{e(m['title'])}</rdf:li></rdf:Alt></dc:title>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">{e(m['description'])}</rdf:li></rdf:Alt></dc:description>
   <dc:creator><rdf:Seq><rdf:li>{e(BRAND)}</rdf:li></rdf:Seq></dc:creator>
   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">{e(COPYRIGHT)}</rdf:li></rdf:Alt></dc:rights>
   <dc:language><rdf:Bag><rdf:li>ko</rdf:li></rdf:Bag></dc:language>
   <dc:subject><rdf:Bag>
{subjects}
   </rdf:Bag></dc:subject>
   <xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="x-default">{e(COPYRIGHT)}</rdf:li></rdf:Alt></xmpRights:UsageTerms>
   <Iptc4xmpCore:AltTextAccessibility><rdf:Alt><rdf:li xml:lang="x-default">{e(m['alt'])}</rdf:li></rdf:Alt></Iptc4xmpCore:AltTextAccessibility>
   <Iptc4xmpCore:CreatorContactInfo rdf:parseType="Resource">
    <Iptc4xmpCore:CiTelWork>{e(PHONE)}</Iptc4xmpCore:CiTelWork>
    <Iptc4xmpCore:CiUrlWork>{e(SITE_URL)}</Iptc4xmpCore:CiUrlWork>
    <Iptc4xmpCore:CiAdrCtry>대한민국</Iptc4xmpCore:CiAdrCtry>
   </Iptc4xmpCore:CreatorContactInfo>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""
    return xmp.encode("utf-8")


def chunk(tag: bytes, data: bytes) -> bytes:
    return tag + struct.pack("<I", len(data)) + data + (b"\0" if len(data) & 1 else b"")


def embed(src: Path, dst: Path, exif: bytes, xmp: bytes) -> None:
    d = src.read_bytes()
    assert d[:4] == b"RIFF" and d[8:12] == b"WEBP", f"{src}: WebP 아님"
    chunks, i = [], 12
    while i < len(d):
        tag, n = d[i:i + 4], struct.unpack("<I", d[i + 4:i + 8])[0]
        chunks.append((tag, d[i + 8:i + 8 + n]))
        i += 8 + n + (n & 1)
    if chunks[0][0] != b"VP8X":
        raise SystemExit(f"{src}: VP8X 확장 포맷이 아님 (단순 포맷 변환은 미지원)")
    chunks = [(t, c) for t, c in chunks if t not in (b"EXIF", b"XMP ")]  # 기존 메타 교체
    vp8x = bytearray(chunks[0][1])
    vp8x[0] |= 0x08 | 0x04  # EXIF + XMP 플래그
    chunks[0] = (b"VP8X", bytes(vp8x))
    chunks += [(b"EXIF", exif), (b"XMP ", xmp)]
    body = b"WEBP" + b"".join(chunk(t, c) for t, c in chunks)
    dst.write_bytes(b"RIFF" + struct.pack("<I", len(body)) + body)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for m in IMAGES:
        keywords = list(dict.fromkeys(COMMON_KEYWORDS + m["keywords"]))
        dst = out_dir / m["out"]
        embed(src_dir / m["src"], dst, build_exif(m, keywords), build_xmp(m, keywords))
        print(f"{m['src']} -> {dst}")


if __name__ == "__main__":
    main()
