from sentence_transformers import SentenceTransformer

# load AI model once
model = SentenceTransformer("all-MiniLM-L6-v2")


# create vector embedding
def create_embedding(text):

    embedding = model.encode(text)

    return embedding.tolist()