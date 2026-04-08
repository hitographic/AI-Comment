"""
==============================================
🔥 SMART COMMENT GENERATOR v3.0 🔥
==============================================
Generate komentar CERDAS berdasarkan isi postingan.
Bisa jalan TANPA API Key (mode template pintar).

Mode:
1. Smart Template - Analisis caption → generate komentar relevan
2. Gemini AI  - Google Gemini GRATIS (1500 req/hari)
3. AI Mode   - OpenAI GPT (opsional, butuh API key berbayar)
"""

import random
import re
import os
from dotenv import load_dotenv

load_dotenv()


def strip_emojis(text: str) -> str:
    """Hapus semua emoji dari teks."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols extended-A
        "\U00002600-\U000026FF"  # misc symbols
        "\U0000FE00-\U0000FE0F"  # variation selectors
        "\U0000200D"             # zero width joiner
        "\U00002B50"             # star
        "\U0000203C-\U00003299"  # misc
        "]+",
        flags=re.UNICODE,
    )
    cleaned = emoji_pattern.sub("", text)
    # Bersihkan spasi ganda
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned

# =============================================
# KEYWORD DETECTION PATTERNS
# =============================================

CONTENT_PATTERNS = {
    "makanan": {
        "keywords": [
            "makan", "food", "kuliner", "resep", "recipe", "masak", "cook",
            "enak", "yummy", "delicious", "lezat", "nasi", "mie", "ayam",
            "sate", "bakso", "rendang", "sambal", "pedas", "manis", "gurih",
            "resto", "restaurant", "cafe", "kopi", "coffee", "dessert",
            "cake", "roti", "bread", "pizza", "burger", "sushi", "ramen",
            "noodle", "seafood", "ikan", "udang", "mukbang", "foodie",
            "jajanan", "snack", "cemilan", "breakfast", "lunch", "dinner",
            "sarapan", "warung", "street food", "homemade", "indomie",
            "boba", "thai tea", "matcha", "coklat", "ice cream", "es krim",
        ],
        "templates": [
            "Wah keliatan enak bgt! Bikin laper aja nih 🤤🔥",
            "Looks so yummy! Auto ngiler parah 😋✨",
            "Food goals bgt sih ini! Drop lokasi dong 📍",
            "Duh jadi pengen makan ini juga 🤤💕",
            "Porsinya mantep! Worth it ga nih? 💰🔥",
            "Kuliner explorer sejati! Auto save buat reference 📌",
            "Ini sih wajib cobain, looks bussin fr fr 🔥😍",
            "Menu baru ya? Tampilannya menggoda bgt! ⭐",
            "Comfort food goals bgt sih ini 🫶✨",
            "Bikin laper tengah malem aja deh 😭🤤",
            "Rating 10/10 pasti ini mah! 💯🍽️",
            "Aesthetik bgt plating nya! Chef's kiss 🤌✨",
            "Waduh ini sih bikin kalap, pengen semua 😍🔥",
            "Bagi resepnya dong! Pengen bikin juga 📝",
            "This is literally food heaven! 😇🍕",
        ],
    },
    "travel": {
        "keywords": [
            "travel", "jalan", "trip", "vacation", "liburan", "holiday",
            "pantai", "beach", "gunung", "mountain", "hiking", "camping",
            "hotel", "resort", "villa", "staycation", "explore", "adventure",
            "sunset", "sunrise", "view", "pemandangan", "landscape",
            "wanderlust", "healing", "bali", "lombok", "raja ampat",
            "yogya", "bandung", "bromo", "danau", "air terjun", "waterfall",
            "flight", "airport", "road trip", "diving", "snorkeling",
            "surfing", "island", "pulau", "tropical",
        ],
        "templates": [
            "Tempatnya aesthetic bgt! Pengen kesana juga 📍✨",
            "Wanderlust vibes! Jadi pengen healing juga nih 🌴😍",
            "View nya gila sih, surga dunia! 🏔️🔥",
            "Bucket list updated! Wajib kesana someday 📝🗺️",
            "Living the dream bgt sih! Jealous 🌅✨",
            "Healing goals bgt! Kapan bisa kesana ya 😭💕",
            "Paradise found! Drop tips dong buat kesana 🏖️",
            "Foto nya kayak wallpaper, cakep bgt! 📸🔥",
            "Nature therapy at its finest! 🌿💚",
            "Pengen bgt kesana, worth it ga trip nya? 🙏",
            "Vibes nya healing bgt, auto recharge! ⚡🌴",
            "Ini dimana sih?? Cakep bgt tempatnya 😍📍",
            "Travel goals! Ajak-ajak dong next trip 🧳✨",
            "The view is breathtaking fr fr 🤩🏔️",
            "Pengen escape ke sini juga deh 🌊💙",
        ],
    },
    "fashion": {
        "keywords": [
            "outfit", "fashion", "ootd", "style", "baju", "dress",
            "hijab", "sepatu", "shoes", "sneakers", "tas", "bag",
            "accessories", "jewelry", "makeup", "skincare", "beauty",
            "stylish", "trendy", "vintage", "streetwear", "casual",
            "elegant", "branded", "thrift", "shopping", "belanja",
            "mix and match", "lookbook", "wardrobe", "collection",
        ],
        "templates": [
            "Outfit nya on point bgt! 🔥👗",
            "Drip check: 100/10! Slay abis 💧✨",
            "Fashion icon sih ini mah! 👑💅",
            "Stylist nya siapa sih? Chef's kiss 🤌✨",
            "OOTD goals bgt! Mau dong inspirasinya 😍",
            "Slaying the fashion game as always! 💅🔥",
            "Fit check nya selalu pass! 🔥✨",
            "Warna nya match bgt, estetik parah! 🎨",
            "Style goals! Where did you get that? 🛍️",
            "Mix n match nya bisa aja, kece bgt! 👏✨",
            "Ga pernah salah outfit deh, selalu on point! 💯",
            "Ini sih fashion inspo bgt ya 😍🔥",
            "Detail nya bagus bgt, tasteful! ✨👌",
            "Auto screenshot buat referensi outfit 📸💕",
        ],
    },
    "selfie": {
        "keywords": [
            "selfie", "mirror", "foto", "photo", "pose", "glow up",
            "glowing", "cantik", "beautiful", "pretty", "handsome",
            "ganteng", "cute", "lucu", "imut", "gorgeous", "stunning",
            "smile", "senyum", "happy", "confidence", "self love",
        ],
        "templates": [
            "Glowing bgt! Skincare routine nya apa sih? ✨😍",
            "Cantik/ganteng parah, ga ada obat! 🔥💕",
            "Main character energy bgt! 👑✨",
            "Slay queen/king! Always looking fire 💅🔥",
            "Self love vibes! Love to see it 🫶💕",
            "The confidence is radiating! You look amazing ✨",
            "Drop the skincare routine bestie! 😭✨",
            "Photogenic bgt sih, ga ada angle jelek! 📸🔥",
            "Vibes nya chill bgt, love it! 😍✨",
            "Looking fresh as always! Never miss 🌟",
            "Udah kayak model sih ini mah! 💃🔥",
            "Aura nya terpancar bgt sih 😍👑",
            "Ga perlu filter, natural beauty! ✨🫶",
        ],
    },
    "motivasi": {
        "keywords": [
            "motivasi", "motivation", "semangat", "sukses", "success",
            "inspirasi", "inspiration", "dream", "mimpi", "goal",
            "hustle", "grind", "work hard", "kerja keras", "never give up",
            "belajar", "learn", "growth", "mindset", "positive",
            "grateful", "bersyukur", "blessed", "achievement", "prestasi",
            "bismillah", "alhamdulillah", "doa", "believe", "percaya",
            "struggle", "discipline", "konsisten", "focus", "progress",
        ],
        "templates": [
            "Semangat terus! You got this 💪🔥",
            "Inspiring bgt! Keep going bestie ✨💕",
            "Real talk sih ini, needed to hear this 🙏",
            "Proud of you! Terus berkarya ya 👑✨",
            "Dedication level: OVER 9000! 💯🔥",
            "Manifesting more success buat kamu! 🙏✨",
            "Growth mindset! Love to see the progress 📈💪",
            "This hits different, so real! 🔥🫶",
            "Konsisten terus ya, pasti makin sukses! 🚀",
            "We love a hardworking person! 👏✨",
            "Setuju bgt! Mindset is everything 🧠🔥",
            "Aamiin! Semoga makin berkah ya ✨🤲",
            "Note to self sih ini! 📝🔥",
        ],
    },
    "lucu": {
        "keywords": [
            "wkwk", "haha", "hihi", "ngakak", "lucu", "funny",
            "meme", "jokes", "humor", "comedy", "receh", "kocak",
            "gokil", "absurd", "relate", "relatable", "lol", "lmao",
            "bruh", "drama", "savage", "prank", "challenge", "trend",
        ],
        "templates": [
            "WKWKWK ini relate bgt sih 😂💀",
            "Ngakak parah! Hampir keselek 🤣🔥",
            "Bruh moment bgt ini! 💀😂",
            "LMAOOO literally me everyday 😭🤣",
            "Comedy gold! Stand up comedian when? 🎤😂",
            "Tag temen yang kayak gini! 😂👇",
            "POV: me seeing this for the 100th time 🔄😂",
            "Living rent free in my head! 🏠😂",
            "Ini sih meme material bgt 💀🔥",
            "Receh tapi bikin ngakak bgt 🤣✨",
            "Content creator of the year sih 🏆😂",
        ],
    },
    "musik": {
        "keywords": [
            "musik", "music", "lagu", "song", "sing", "nyanyi",
            "cover", "guitar", "gitar", "piano", "drum", "band",
            "concert", "konser", "spotify", "playlist", "album",
            "vocal", "suara", "voice", "melody", "beat",
            "karaoke", "duet", "perform", "rap", "pop", "rock",
            "indie", "acoustic", "live", "studio", "recording",
        ],
        "templates": [
            "Suaranya bagus bgt! Enak didengar 🎵😍",
            "Talent! Auto replay ini sih 🔁🔥",
            "Merinding dengernya, goosebumps! 🫠✨",
            "Drop full version dong! Penasaran 🎶",
            "Playlist material bgt ini! 🎧🔥",
            "Vocal nya keren bgt, auto subscribe! 📢✨",
            "This is a bop! Can't stop listening 🎵💕",
            "Aransemen nya unik bgt, love it! 🎸🔥",
            "Spotify when?? Pengen save di playlist! 🎧",
            "Eargasm bgt dengerin ini! 🤩🎵",
            "Live performance nya keren parah! 🎤🔥",
        ],
    },
    "olahraga": {
        "keywords": [
            "gym", "workout", "fitness", "olahraga", "sport", "lari",
            "run", "jogging", "exercise", "diet", "healthy", "sehat",
            "body goals", "muscle", "otot", "training", "latihan",
            "basketball", "football", "futsal", "badminton", "swimming",
            "yoga", "pilates", "boxing", "marathon", "cycling", "sepeda",
        ],
        "templates": [
            "Body goals bgt! Workout routine nya apa? 💪🔥",
            "Dedication! Semangat terus gym nya 🏋️✨",
            "Goals bgt sih, konsisten ya! 💪😍",
            "Atletis bgt! Keep grinding 🔥🏃",
            "Healthy lifestyle goals! Inspiring 🌿💪",
            "Form nya bagus bgt, proper! 👏🔥",
            "Beast mode activated! 💪🔥🔥",
            "Semangat terus! No pain no gain 🏋️✨",
            "Progress nya kelihatan bgt, proud! 📈💪",
            "Jadi ikut termotivasi nih! 🔥💪",
        ],
    },
    "bisnis": {
        "keywords": [
            "bisnis", "business", "usaha", "jualan", "promo", "diskon",
            "sale", "harga", "order", "beli", "produk", "brand",
            "launching", "opening", "entrepreneur", "startup", "umkm",
            "marketing", "online shop", "olshop", "testimoni", "best seller",
        ],
        "templates": [
            "Wah keren bgt produknya! Sukses terus ya 🚀🔥",
            "Mantap! Semoga makin laris ya 📈✨",
            "Produknya bagus bgt, auto checkout! 🛒💕",
            "Support local business! Semangat 💪🔥",
            "Quality nya keliatan bagus bgt! ⭐✨",
            "Seriusan bagus bgt ini, recommended! 💯",
            "Auto save buat nanti order! 📌🔥",
            "Keep up the good work! Makin sukses ya 🚀",
            "Packaging nya aesthetic bgt! 😍📦",
        ],
    },
    "pet": {
        "keywords": [
            "kucing", "cat", "anjing", "dog", "puppy", "kitten",
            "pet", "hewan", "animal", "peliharaan", "meong",
            "hamster", "kelinci", "burung", "anabul", "fur baby",
        ],
        "templates": [
            "GEMESH BGT! Pengen peluk 🥹💕",
            "Anabul nya lucu bgt! Nama nya siapa? 😍🐾",
            "Fur baby goals! So cute 🤗💕",
            "Duh ga kuat liat yang lucu-lucu 😭💕",
            "Pet parent of the year! 🏆🐾",
            "Menggemaskan parah! Auto senyum liat ini 😊💕",
            "Tingkah nya lucu bgt, healing! 🥹✨",
            "Kayak boneka hidup! Cute overload 🧸💕",
            "Bikin pengen punya juga! 😭🐾",
        ],
    },
    "pujian_umum": {
        "keywords": [],
        "templates": [
            "Gila sih ini keren bgt!! 🔥🔥",
            "Aesthetic bgt, vibes nya dapet! ✨😍",
            "Slay abis! Ga ada obat 💅🔥",
            "This is so fire bruh 🔥🤩",
            "Kece parah, auto saved! 😍📌",
            "Literally the best thing I've seen today! 💯",
            "No cap, ini bagus bgt sih 🫶✨",
            "Main character energy bgt ini mah 👑🔥",
            "Gaskeun terus! Selalu keren 🚀✨",
            "Wah ini sih next level bgt ya 🤯🔥",
            "Kontennya selalu beda, love it! 💕",
            "Underrated bgt, deserve more! 📈",
            "Elite content fr fr 🏆🔥",
            "Selalu konsisten bagus deh! 👏✨",
            "Never disappoints! Always on top 🔝🔥",
            "Creative bgt, out of the box! 🎨🔥",
            "Top tier content as always! 👑💯",
        ],
    },
    "supportive": {
        "keywords": [],
        "templates": [
            "Keep going! Selalu support kamu 🫶💪",
            "You got this bestie! 💕✨",
            "Proud of you! Terus berkarya ya 👑",
            "Semangat terus! Kontennya selalu inspiring 💫",
            "Real ones support real ones 🤝🔥",
            "Growth nya amazing bgt! 📈✨",
            "Konsisten terus ya, pasti makin sukses! 🚀",
            "Dedication level: OVER 9000 💯🔥",
            "Manifesting more success buat kamu! 🙏✨",
        ],
    },
    "engagement_boost": {
        "keywords": [],
        "templates": [
            "Setuju bgt! Menurut kalian gimana? 👇",
            "Ini sih facts, no debate! 📢🔥",
            "Share ke temen kalian yang butuh liat ini! 📤",
            "Rate 1-10? Menurutku 11 sih! 💯",
            "Bookmark dulu, ntar dipraktekin! 📌",
            "Noted! Makasih bgt info nya 📝🙏",
            "Wajib FYP sih ini! 🚀🔥",
            "Algorithm, do your thing! 🤖✨",
        ],
    },
}

GENZ_EMOJIS = [
    "🔥", "✨", "💅", "🫶", "💀", "😭", "🤩", "💯", "👑", "🚀",
    "😍", "🤌", "💕", "📈", "🏆", "⭐", "🎯", "💫", "🌟", "😂",
]


def detect_content_type(caption: str) -> str:
    """
    Analisis caption untuk mendeteksi tipe konten.
    Return kategori yang paling cocok berdasarkan keyword matching.
    """
    if not caption:
        return "pujian_umum"

    caption_lower = caption.lower()
    scores = {}

    for category, data in CONTENT_PATTERNS.items():
        if not data["keywords"]:
            continue
        score = 0
        for keyword in data["keywords"]:
            if keyword.lower() in caption_lower:
                score += 1
                if len(keyword) > 5:
                    score += 0.5
        if score > 0:
            scores[category] = score

    if not scores:
        return random.choice(["pujian_umum", "supportive", "engagement_boost"])

    return max(scores, key=scores.get)


def smart_template_comment(caption: str = "", post_type: str = None, use_emoji: bool = True) -> str:
    """
    Generate komentar CERDAS berdasarkan analisis caption.
    TIDAK memerlukan API key.
    """
    if post_type and post_type in CONTENT_PATTERNS:
        category = post_type
    else:
        category = detect_content_type(caption)

    templates = CONTENT_PATTERNS[category]["templates"]
    comment = random.choice(templates)

    # 20% chance variasi prefix
    if random.random() < 0.2 and not comment.startswith(("Wah", "Duh", "Gila")):
        prefix = random.choice(["Wah ", "Duh ", "Gila sih "])
        comment = prefix + comment[0].lower() + comment[1:]

    # 15% chance emoji extra
    if use_emoji and random.random() < 0.15:
        comment += f" {random.choice(GENZ_EMOJIS)}"

    if not use_emoji:
        comment = strip_emojis(comment)

    return comment


def get_template_comment(category: str = None, use_emoji: bool = True) -> str:
    """Generate komentar dari template (backward compatible)."""
    if category and category in CONTENT_PATTERNS:
        templates = CONTENT_PATTERNS[category]["templates"]
    else:
        all_comments = []
        for cat_data in CONTENT_PATTERNS.values():
            all_comments.extend(cat_data["templates"])
        templates = all_comments

    comment = random.choice(templates)
    if use_emoji and random.random() < 0.3:
        comment += f" {random.choice(GENZ_EMOJIS)}"

    if not use_emoji:
        comment = strip_emojis(comment)

    return comment


# =============================================
# GEMINI AI MODE (GRATIS!)
# =============================================

def get_gemini_comment(post_caption: str = "", post_type: str = "general", api_key: str = None, use_emoji: bool = True) -> str:
    """
    Generate komentar via Google Gemini AI (GRATIS).
    Free tier: 1500 request/hari, 15 RPM.
    Komentar HARUS relevan dengan isi caption/postingan.
    Fallback ke smart template jika gagal.
    """
    try:
        from google import genai

        # Cek API key
        gemini_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not gemini_key or gemini_key.startswith("AIza-your"):
            print("⚠️ Gemini API key belum diset, fallback ke smart template")
            return smart_template_comment(post_caption, post_type, use_emoji)

        client = genai.Client(api_key=gemini_key)

        emoji_instruction = "- Pakai 1-3 emoji yang relevan dengan topik" if use_emoji else "- JANGAN pakai emoji/emoticon sama sekali"

        system_prompt = f"""Kamu adalah user Instagram biasa (Gen Z Indonesia, umur 18-25 tahun).
Tugasmu: buat 1 komentar SINGKAT yang SANGAT RELEVAN dengan isi postingan.

ATURAN PALING PENTING:
- BACA CAPTION dengan teliti, pahami topik/produk/aktivitas yang dibahas
- Komentar HARUS menyebut atau mereferensikan hal spesifik dari caption
- Jika caption soal PARFUM → komentarin soal wanginya, tertarik, dll
- Jika caption soal MAKANAN → komentarin soal rasa, pengen coba, dll  
- Jika caption soal OUTFIT → komentarin soal style, keren, dll
- Jika caption soal TEMPAT → komentarin soal tempatnya, pengen ke sana, dll
- Jangan buat komentar generik yang bisa dipasang di post manapun!

ATURAN GAYA:
- Campur bahasa Indonesia-English (Jaksel style) secara natural
{emoji_instruction}
- Maksimal 1-2 kalimat pendek (10-25 kata)
- Casual & friendly, seperti komentar teman beneran
- Jangan formal, jangan baku, jangan kaku
- Jangan pakai hashtag (#)
- Jangan pakai tanda kutip
- Positif & supportive
- Variasikan pembukaan (jangan selalu "Wah")

CONTOH KOMENTAR YANG BAGUS (RELEVAN):
Caption: "Parfum baru, wanginya bikin level kegantengan naik"
Komentar: "Tertarik nih sama parfumnya, wangi woody gitu ya? Auto checkout sih"

Caption: "Nasi goreng spesial buatan mama"  
Komentar: "Auto laper liat nasi goreng nya, mama kamu jago masak bgt deh"

Caption: "Sunset di Bali kemarin"
Komentar: "Bali emang beda sih sunset nya, kapan ajak-ajak nih"

Caption: "OOTD hari ini vintage style"
Komentar: "Vintage vibes nya on point bgt, cocok bgt sama kamu style nya"

CONTOH KOMENTAR YANG JELEK (GENERIK - JANGAN SEPERTI INI):
- "Keren bgt!" (terlalu generik)
- "Amazing!" (tidak relevan) 
- "Nice post!" (tidak nyebut topik)"""

        user_prompt = ""
        if post_caption:
            user_prompt = f"Caption postingan:\n\"{post_caption}\"\n\nBuatkan 1 komentar yang SPESIFIK dan RELEVAN dengan caption di atas:"
        else:
            user_prompt = f"Postingan bertipe: {post_type}\nBuatkan 1 komentar casual yang relevan:"

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=system_prompt + "\n\n" + user_prompt,
            config={
                "max_output_tokens": 150,
                "temperature": 0.9,
                "top_p": 0.95,
            },
        )

        comment = response.text.strip().strip('"').strip("'").strip()

        # Validasi: komentar harus reasonable
        if len(comment) < 5 or len(comment) > 300:
            print(f"⚠️ Gemini output invalid (len={len(comment)}), fallback ke template")
            return smart_template_comment(post_caption, post_type)

        # Hapus hashtag kalau ada
        comment = re.sub(r"#\w+", "", comment).strip()

        # Hapus emoji jika user tidak ingin emoji
        if not use_emoji:
            comment = strip_emojis(comment)

        return comment

    except Exception as e:
        print(f"⚠️ Gemini Error: {e}, falling back to smart template")
        return smart_template_comment(post_caption, post_type, use_emoji)


def get_ai_comment(post_caption: str = "", post_type: str = "general", use_emoji: bool = True) -> str:
    """Generate komentar via OpenAI GPT. Fallback ke smart template jika gagal."""
    try:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("sk-your"):
            return smart_template_comment(post_caption, post_type, use_emoji)

        emoji_rule = "Pakai 2-4 emoji." if use_emoji else "JANGAN pakai emoji apapun."

        client = OpenAI(api_key=api_key)
        system_prompt = f"""Kamu adalah Gen Z Indonesia yang gaul dan friendly. 
Buat komentar singkat untuk postingan social media. 
Campur Indonesia-English (Jaksel style). {emoji_rule} Positif & supportive.
Maksimal 1-2 kalimat. Jangan formal. Jangan pakai hashtag."""

        user_prompt = f"Buatkan 1 komentar Gen Z untuk postingan {post_type}."
        if post_caption:
            user_prompt += f"\nCaption: {post_caption}"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=100,
            temperature=0.9,
        )
        comment = response.choices[0].message.content.strip().strip('"').strip("'")
        if not use_emoji:
            comment = strip_emojis(comment)
        return comment
    except Exception as e:
        print(f"⚠️ AI Error: {e}, falling back to smart template")
        return smart_template_comment(post_caption, use_emoji=use_emoji)


def generate_comment(
    mode: str = "gemini",
    category: str = None,
    post_caption: str = "",
    post_type: str = "general",
    gemini_api_key: str = None,
    use_emoji: bool = True,
) -> str:
    """
    Generate komentar. Default mode 'gemini' (GRATIS).
    Template hanya digunakan sebagai fallback jika Gemini gagal.
    
    Mode:
    - 'gemini'    : Google Gemini AI (GRATIS, default) — komentar kontekstual
    - 'ai'        : OpenAI GPT (berbayar)
    - 'template'  : Smart template offline (fallback)
    
    use_emoji=False → komentar tanpa emoticon
    """
    if mode == "gemini" or mode == "template":
        # Selalu coba Gemini dulu, fallback ke template otomatis di dalam fungsi
        return get_gemini_comment(post_caption, post_type, gemini_api_key, use_emoji)
    elif mode == "ai":
        return get_ai_comment(post_caption, post_type, use_emoji)
    else:
        return get_gemini_comment(post_caption, post_type, gemini_api_key, use_emoji)


def get_categories() -> list:
    """Return daftar kategori komentar."""
    return list(CONTENT_PATTERNS.keys())


def get_template_count() -> int:
    """Return total jumlah template komentar."""
    return sum(len(d["templates"]) for d in CONTENT_PATTERNS.values())


def analyze_caption(caption: str) -> dict:
    """Analisis caption dan return info detail."""
    category = detect_content_type(caption)
    comment = smart_template_comment(caption)
    return {
        "detected_category": category,
        "caption_preview": caption[:100] + ("..." if len(caption) > 100 else ""),
        "suggested_comment": comment,
    }


if __name__ == "__main__":
    print("=" * 50)
    print("🔥 SMART COMMENT GENERATOR v3.0 TEST 🔥")
    print("=" * 50)
    print(f"\n📊 Total template: {get_template_count()} komentar")
    print(f"📁 Kategori: {', '.join(get_categories())}")
    print(f"🤖 Mode tersedia: template, gemini (GRATIS), ai (OpenAI)")

    test_captions = [
        "Nasi goreng spesial buatan mama 🍳 enak bgt!",
        "Morning run 5km done! 💪",
        "Sunset di Bali kemarin, healing bgt 🌅",
        "OOTD hari ini, mix and match vintage style ✨",
        "Kucing gue lagi tidur, gemesh bgt 😭",
        "Alhamdulillah target tercapai tahun ini 🙏",
        "WKWKWK gue banget sih ini 😂",
        "",
    ]

    print("\n--- Smart Template Mode (TANPA API) ---")
    for caption in test_captions:
        result = analyze_caption(caption)
        print(f"\n  Caption: '{caption}'")
        print(f"  Detected: {result['detected_category']}")
        print(f"  Comment: {result['suggested_comment']}")

    # Test Gemini jika API key tersedia
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key and not gemini_key.startswith("AIza-your"):
        print("\n--- Gemini AI Mode (GRATIS) ---")
        for caption in test_captions[:3]:
            comment = get_gemini_comment(caption, api_key=gemini_key)
            print(f"\n  Caption: '{caption}'")
            print(f"  Gemini: {comment}")
    else:
        print("\n💡 Set GEMINI_API_KEY untuk test Gemini AI mode")
        print("   Dapatkan GRATIS di: https://aistudio.google.com/apikey")
