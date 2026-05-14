from backend.services.embedding_service import generate_embedding

def save_command_embedding(db, text):

    embedding = generate_embedding(text)

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO command_embeddings
        (command_text, embedding)
        VALUES (%s, %s)
    """, (text, embedding))

    conn.commit()

    cur.close()
    conn.close()


def search_similar_command(db, text):

    embedding = generate_embedding(text)

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT command_text,
               embedding <=> %s::vector AS distance
        FROM command_embeddings
        ORDER BY distance
        LIMIT 1
    """, (embedding,))

    result = cur.fetchone()

    cur.close()
    conn.close()

    return result