import hashlib

VECTOR_SIZE = 32


def embed_text(text: str):

    text = text.lower().strip()

    vector = [0.0] * VECTOR_SIZE

    words = text.split()

    for word in words:

        h = hashlib.md5(word.encode()).hexdigest()

        for i in range(VECTOR_SIZE):

            vector[i] += int(h[i % len(h)], 16)

    return vector


def save_command(db, command, intent, product):

    conn = db()
    cur = conn.cursor()

    embedding = embed_text(command)

    cur.execute("""
        INSERT INTO command_memory (command, intent, product, embedding)
        VALUES (%s, %s, %s, %s)
    """, (command, intent, product, embedding))

    conn.commit()
    conn.close()


def find_similar(db, command):

    conn = db()
    cur = conn.cursor()

    embedding = embed_text(command)

    cur.execute("""
        SELECT command, intent, product
        FROM command_memory
        ORDER BY embedding <-> %s
        LIMIT 3
    """, (embedding,))

    results = cur.fetchall()

    conn.close()

    return results