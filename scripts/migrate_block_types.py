import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "krayasetu.db"))
print(f"Migrating database at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Add columns to 'blocks' if not present
cursor.execute("PRAGMA table_info(blocks)")
block_cols = [row[1] for row in cursor.fetchall()]

new_block_cols = [
    ("block_type", "VARCHAR(30) DEFAULT 'PLANNED'"),
    ("planning_origin", "VARCHAR(100)"),
    ("planning_date", "VARCHAR(20)"),
    ("execution_date", "VARCHAR(20)")
]

for col_name, col_def in new_block_cols:
    if col_name not in block_cols:
        print(f"Adding column '{col_name}' to 'blocks'...")
        cursor.execute(f"ALTER TABLE blocks ADD COLUMN {col_name} {col_def}")
    else:
        print(f"Column '{col_name}' already exists in 'blocks'.")

# 2. Add 'block_id' to 'maintenance_tasks' if not present
cursor.execute("PRAGMA table_info(maintenance_tasks)")
task_cols = [row[1] for row in cursor.fetchall()]

if "block_id" not in task_cols:
    print("Adding column 'block_id' to 'maintenance_tasks'...")
    cursor.execute("ALTER TABLE maintenance_tasks ADD COLUMN block_id VARCHAR(50)")
else:
    print("Column 'block_id' already exists in 'maintenance_tasks'.")

if "completed_at" not in task_cols:
    print("Adding column 'completed_at' to 'maintenance_tasks'...")
    cursor.execute("ALTER TABLE maintenance_tasks ADD COLUMN completed_at DATETIME")
else:
    print("Column 'completed_at' already exists in 'maintenance_tasks'.")

conn.commit()
conn.close()
print("Migration completed successfully.")
