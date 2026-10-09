"""Authored course hierarchy shared with the frontend; learner records keep lesson IDs."""
import json
from pathlib import Path
COURSES = json.loads(Path(__file__).with_name('curriculum.json').read_text(encoding='utf-8'))
def lesson_ids(language):
    return tuple(lesson for section in sorted(COURSES[language]['sections'], key=lambda item:item['order'])
        for unit in sorted(section['units'], key=lambda item:item['order']) for lesson in unit['lesson_ids'])
