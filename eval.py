import csv, time
from rag import answer, retrieve

# Har test: sawal + wo shabd jo sahi jawab/chunk me hone chahiye (lowercase)
TESTS = [
    {"q": "What is the minimum attendance required for end-semester exams?", "expect": ["75 percent", "75%"]},
    {"q": "What is the annual tuition fee for B.Tech?", "expect": ["1,20,000", "120,000"]},
    {"q": "When is the library open?", "expect": ["8 am", "10 pm"]},
    {"q": "What is the late fee after the due date?", "expect": ["500"]},
    {"q": "Who is the Principal?", "expect": ["meera nair"]},
    {"q": "What was the highest placement package in 2025?", "expect": ["18 lpa", "18"]},
    {"q": "What CGPA is needed for the Merit Scholarship?", "expect": ["9.0"]},
    {"q": "What is the hostel capacity?", "expect": ["600"]},
    {"q": "What is the re-evaluation fee?", "expect": ["500"]},
    {"q": "What is the fine for a late library book return?", "expect": ["5 per day", "inr 5"]},
    {"q": "Who is the Dean of Academics?", "expect": ["arjun verma"]},
    {"q": "What is the hostel fee per year?", "expect": ["60,000"]},
    {"q": "What is the one time admission fee?", "expect": ["10,000"]},
    {"q": "How many books can a student borrow?", "expect": ["4 books", "4"]},
    {"q": "What is the campus Wi-Fi network called?", "expect": ["git-campus"]},
]

# Ye sawal documents me nahi hain, bot ko mana karna chahiye
OUT_OF_SCOPE = [
    "What is the capital of France?",
    "Who won the 2018 FIFA World Cup?",
    "Write a Python function to sort a list.",
]

REFUSAL_PHRASES = ["couldn't find", "don't know", "do not know", "not mentioned", "no information"]

def contains_any(text, words):
    text = text.lower()
    return any(w in text for w in words)

def run_evaluation(output_file="eval_results.csv"):
    rows = []
    hits = correct = 0

    for t in TESTS:
        start = time.time()
        retrieved_docs = retrieve(t["q"])
        retrieved = " ".join(d["text"] for d in retrieved_docs)
        ans, _ = answer(t["q"])
        hit = contains_any(retrieved, t["expect"])
        ok = contains_any(ans, t["expect"])
        hits += hit
        correct += ok
        dur = round(time.time() - start, 1)
        rows.append([t["q"], "in-scope", hit, ok, dur, ans.replace("\n", " ")])
        print(f"{'PASS' if ok else 'FAIL'} | hit={hit} | {t['q']}")

    refused = 0
    for q in OUT_OF_SCOPE:
        start = time.time()
        ans, docs = answer(q)
        ok = (not docs) or contains_any(ans, REFUSAL_PHRASES)
        refused += ok
        dur = round(time.time() - start, 1)
        rows.append([q, "out-of-scope", "", ok, dur, ans.replace("\n", " ")])
        print(f"{'PASS' if ok else 'FAIL'} | refusal | {q}")

    n, m = len(TESTS), len(OUT_OF_SCOPE)
    print("\n===== RESULTS =====")
    print(f"Retrieval hit rate : {hits}/{n} = {hits / n:.0%}")
    print(f"Answer accuracy    : {correct}/{n} = {correct / n:.0%}")
    print(f"Refusal rate       : {refused}/{m} = {refused / m:.0%}")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["question", "type", "retrieval_hit", "correct", "seconds", "answer"])
        w.writerows(rows)
    print(f"Saved: {output_file}")
    return rows

if __name__ == "__main__":
    run_evaluation()
