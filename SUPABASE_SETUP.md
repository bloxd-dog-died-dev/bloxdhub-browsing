# Supabase Knowledge Base Setup

This browser now uses Supabase as its knowledge base instead of AI-generated results.

## 1. Create the `knowledge_base` Table

In your Supabase dashboard, run this SQL query to create the table:

```sql
CREATE TABLE knowledge_base (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT NOT NULL,
  content TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Full-Text Search (optional, for better search)
CREATE INDEX idx_knowledge_base_title ON knowledge_base USING GIN (to_tsvector('english', title));
CREATE INDEX idx_knowledge_base_content ON knowledge_base USING GIN (to_tsvector('english', content));
```

## 2. Add Search Results

Insert sample data into your knowledge base:

```sql
INSERT INTO knowledge_base (title, url, snippet, content, category) VALUES
('Getting Started with JavaScript', 'https://example.com/js-intro', 'Learn the basics of JavaScript programming', 'Complete guide to JavaScript fundamentals...', 'Programming'),
('Python Data Science Tutorial', 'https://example.com/python-ds', 'Master data science with Python and pandas', 'Learn how to work with data using Python...', 'Programming'),
('Web Development Best Practices', 'https://example.com/web-dev', 'Tips and tricks for modern web development', 'Essential practices for building robust web applications...', 'Web'),
('Database Design Patterns', 'https://example.com/db-design', 'Learn effective database design strategies', 'Common patterns and best practices for database design...', 'Database'),
('React Components Guide', 'https://example.com/react', 'Comprehensive guide to React component development', 'Master React components, hooks, and state management...', 'Web');
```

## 3. Configure Permissions

In Supabase, set up Row Level Security (RLS):

```sql
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow public read access (optional)
CREATE POLICY "Public read access" ON knowledge_base
FOR SELECT USING (true);

-- If you need write access from your app:
CREATE POLICY "Authenticated users can insert" ON knowledge_base
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 4. Test Your Setup

1. Run `npm install` to install dependencies
2. Update `.env.local` with your Supabase credentials (already done)
3. Run `npm run dev` to start the development server
4. Try searching for keywords that match your knowledge base entries

## 5. Adding More Content

You can add more articles to your knowledge base directly via the Supabase dashboard or with SQL:

```sql
INSERT INTO knowledge_base (title, url, snippet, content, category) VALUES
('Your Topic Title', 'https://your-url.com', 'Brief description', 'Full content here...', 'Your Category');
```

## Notes

- The search is performed using `ilike` for case-insensitive matching on title, snippet, and content fields
- Results are limited to 10 items per search
- You can modify the search logic in `browser.js` under the `performLocalSearch` function
