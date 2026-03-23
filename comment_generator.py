"""
==============================================
🔥 GEN Z AUTO COMMENT GENERATOR 🔥
==============================================
Module untuk generate komentar dengan gaya bahasa Gen Z
yang gaul, kekinian, dan friendly.

Mendukung 2 mode:
1. Template Mode - Menggunakan template komentar yang sudah disiapkan
2. AI Mode - Menggunakan OpenAI GPT untuk generate komentar unik
"""

import random
import os
from dotenv import load_dotenv

load_dotenv()

# =============================================
# TEMPLATE KOMENTAR GEN Z 🔥
# =============================================

COMMENT_TEMPLATES = {
    "pujian_umum": [
        "Gila sih ini keren banget!! 🔥🔥",
        "Aesthetic bgt deh, vibes nya dapet! ✨",
        "Slay abis! Ga ada obat 💅",
        "This is so fire bruh 🔥🤩",
        "Kece parah, auto saved! 😍",
        "Duh keren bgt, bikin iri aja 😭🔥",
        "Literally the best thing I've seen today! 💯",
        "No cap, ini bagus bgt sih 🫶",
        "Vibe check: PASSED with flying colors ✅✨",
        "Main character energy bgt ini mah 👑",
        "Gaskeun terus bang/kak! Selalu keren 🚀",
        "Wah ini sih next level bgt ya 🤯",
        "Kontennya selalu beda, love it! 💕",
        "Underrated bgt sih ini, deserve more! 📈",
        "Bro this is elite content fr fr 🏆",
    ],
    "pujian_outfit": [
        "Outfit nya on point bgt! 👗🔥",
        "Drip check: 100/10 💧✨",
        "Fashion icon sih ini mah 👑",
        "Stylist nya siapa sih? Chef's kiss! 🤌",
        "Ootd goals bgt!! Mau dong inspirasinya 😍",
        "Slaying the fashion game as always 💅✨",
        "Fit check nya selalu pass! 🔥",
        "Warna nya match bgt, estetik parah! 🎨",
        "Where did you get that?? Need info dong! 🛍️",
        "Baju nya bagus bgt, auto checkout nih 🛒",
    ],
    "pujian_makanan": [
        "Looks yummy bgt! Bikin laper 🤤🍽️",
        "Food porn alert! 🚨 Ini enak bgt pasti 😋",
        "Aduh jadi pengen, drop lokasi dong! 📍",
        "Mukbang vibes! Bikin ngiler parah 🤤",
        "Kuliner explorer sejati! Auto save buat reference 📌",
        "This looks absolutely bussin no cap 🔥🍔",
        "Porsinya mantep bgt, worth it ga? 💰",
        "Menu baru ya? Wajib coba sih ini 📝",
        "Rating berapa nih? Kayaknya enak bgt! ⭐",
        "Comfort food goals bgt sih ini 🫶",
    ],
    "pujian_travel": [
        "Tempatnya aesthetic bgt! Drop lokasi dong 📍✨",
        "Wanderlust vibes bgt! Jadi pengen healing 🌴",
        "View nya gila sih, surga dunia! 🏔️😍",
        "Bucket list updated! Wajib kesana 📝🗺️",
        "Living the dream bgt sih 🌅✨",
        "Healing goals! Kapan bisa kesana ya 😭",
        "Paradise found! Ini dimana sih?? 🏖️",
        "Foto nya kayak wallpaper, cakep bgt! 📸",
        "Nature therapy at its finest 🌿💚",
        "Pengen banget kesana, tips dong! 🙏",
    ],
    "supportive": [
        "Keep going! Selalu support kamu 🫶💪",
        "You got this bestie! 💕",
        "Proud of you! Terus berkarya ya ✨",
        "Semangat terus! Kontennya selalu inspiring 💫",
        "Real ones support real ones 🤝🔥",
        "We love a hardworking queen/king! 👑",
        "Growth nya amazing bgt! 📈✨",
        "Konsisten terus ya, pasti makin sukses! 🚀",
        "Dedication level: OVER 9000 💯🔥",
        "Manifesting more success buat kamu! 🙏✨",
    ],
    "lucu": [
        "WKWKWK ini relate bgt sih 😂💀",
        "Ngakak parah, hampir keselek 🤣🤣",
        "Bruh moment bgt ini 💀😂",
        "LMAOOO literally me everyday 😭🤣",
        "Comedy gold! Stand up comedian when? 🎤😂",
        "Aku di rumah: exactly like this 💀😂",
        "Tag temen yang kayak gini 😂👇",
        "POV: me seeing this for the 100th time 🔄😂",
        "Living rent free in my head 🏠😂",
        "Ini sih meme material bgt 💀🔥",
    ],
    "engagement_boost": [
        "Setuju bgt! Menurut kalian gimana? 👇",
        "Ini sih facts, no debate! 📢",
        "Share ke temen kalian yang butuh liat ini! 📤",
        "Siapa yang relate? Angkat tangan! 🙋‍♂️",
        "Drop emoji favorit kalian di bawah! 👇",
        "Rate 1-10? Menurutku 11 sih! 💯",
        "Bookmark dulu, ntar dipraktekin! 📌",
        "Noted! Makasih banget info nya 📝🙏",
        "Wajib FYP sih ini! 🚀",
        "Algorithm, do your thing! 🤖✨",
    ],
}

# Emoji yang sering dipakai Gen Z
GENZ_EMOJIS = [
    "🔥", "✨", "💅", "🫶", "💀", "😭", "🤩", "💯", "👑", "🚀",
    "😍", "🤌", "💕", "📈", "🏆", "⭐", "🎯", "💫", "🌟", "😂",
    "🤣", "💖", "🫠", "🥹", "🤝", "👏", "🙌", "💪", "🎉", "🎊",
]

# Slang Gen Z
GENZ_PREFIXES = [
    "Ngl", "Fr fr", "No cap", "Lowkey", "Highkey", "Literally",
    "Bestie", "Slay", "Periodt", "Bruh", "Sis", "Bro",
    "Duh", "Gila", "Anjir", "Wah", "Goks", "Mantep",
]

GENZ_SUFFIXES = [
    "sih!", "bgt!", "parah!", "banget!", "dong!", "lah!",
    "fr fr!", "no cap!", "periodt!", "sis!", "bestie!",
    "goks!", "cuy!", "woi!", "ges!", "gaes!",
]


def get_template_comment(category: str = None) -> str:
    """
    Generate komentar dari template yang sudah disiapkan.

    Args:
        category: Kategori komentar (pujian_umum, pujian_outfit, dll)
                 Jika None, akan random dari semua kategori.

    Returns:
        String komentar Gen Z
    """
    if category and category in COMMENT_TEMPLATES:
        comments = COMMENT_TEMPLATES[category]
    else:
        # Random dari semua kategori
        all_comments = []
        for cat_comments in COMMENT_TEMPLATES.values():
            all_comments.extend(cat_comments)
        comments = all_comments

    comment = random.choice(comments)

    # 30% chance menambah emoji extra
    if random.random() < 0.3:
        extra_emoji = random.choice(GENZ_EMOJIS)
        comment += f" {extra_emoji}"

    return comment


def get_ai_comment(post_caption: str = "", post_type: str = "general") -> str:
    """
    Generate komentar menggunakan OpenAI GPT dengan gaya Gen Z.

    Args:
        post_caption: Caption dari postingan
        post_type: Tipe postingan (general, food, travel, fashion, funny, motivational)

    Returns:
        String komentar Gen Z dari AI
    """
    try:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("sk-your"):
            # Fallback ke template jika API key belum diset
            return get_template_comment()

        client = OpenAI(api_key=api_key)

        system_prompt = """Kamu adalah Gen Z Indonesia yang gaul dan friendly. 
Tugasmu adalah membuat komentar singkat untuk postingan social media (Instagram/TikTok).

RULES:
- Gunakan bahasa campuran Indonesia dan English (Jaksel style)
- Pakai slang Gen Z: slay, vibes, aesthetic, no cap, fr fr, lowkey, bestie, dll
- Tambahkan emoji yang relevan (2-4 emoji)
- Komentar harus POSITIF dan SUPPORTIVE
- Maksimal 1-2 kalimat saja
- Jangan terlalu formal
- Jangan pakai hashtag
- Variasi setiap komentar, jangan repetitif
- Sesekali pakai singkatan: bgt, bsk, gpp, dll

CONTOH KOMENTAR:
- "Gila sih ini keren bgt! Vibes nya dapet 🔥✨"
- "Slay abis bestie! Auto saved 💅😍"
- "No cap this is the best thing I've seen today 💯🔥"
- "Aesthetic parah, living the dream bgt sih ✨🌴"
"""

        user_prompt = f"Buatkan 1 komentar Gen Z untuk postingan {post_type}."
        if post_caption:
            user_prompt += f"\nCaption postingan: {post_caption}"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=100,
            temperature=0.9,
        )

        comment = response.choices[0].message.content.strip()
        # Hapus tanda kutip jika ada
        comment = comment.strip('"').strip("'")
        return comment

    except Exception as e:
        print(f"⚠️ AI Error: {e}, falling back to template")
        return get_template_comment()


def generate_comment(
    mode: str = "template",
    category: str = None,
    post_caption: str = "",
    post_type: str = "general",
) -> str:
    """
    Generate komentar berdasarkan mode yang dipilih.

    Args:
        mode: 'template' atau 'ai'
        category: Kategori untuk template mode
        post_caption: Caption postingan untuk AI mode
        post_type: Tipe postingan untuk AI mode

    Returns:
        String komentar Gen Z
    """
    if mode == "ai":
        return get_ai_comment(post_caption, post_type)
    else:
        return get_template_comment(category)


def get_categories() -> list:
    """Return daftar kategori komentar yang tersedia."""
    return list(COMMENT_TEMPLATES.keys())


def get_template_count() -> int:
    """Return total jumlah template komentar."""
    total = 0
    for comments in COMMENT_TEMPLATES.values():
        total += len(comments)
    return total


# Test
if __name__ == "__main__":
    print("=" * 50)
    print("🔥 GEN Z COMMENT GENERATOR TEST 🔥")
    print("=" * 50)

    print(f"\n📊 Total template: {get_template_count()} komentar")
    print(f"📁 Kategori: {', '.join(get_categories())}")

    print("\n--- Template Mode ---")
    for i in range(5):
        print(f"  {i+1}. {get_template_comment()}")

    print("\n--- Category: lucu ---")
    for i in range(3):
        print(f"  {i+1}. {get_template_comment('lucu')}")

    print("\n--- AI Mode (butuh API key) ---")
    comment = generate_comment(mode="ai", post_type="food")
    print(f"  1. {comment}")
