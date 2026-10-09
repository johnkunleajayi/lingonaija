from app.curriculum import COURSES, lesson_ids
from app.learning import ANSWER_KEYS

def test_current_sections_preserve_all_published_lesson_ids():
    for language,course in COURSES.items():
        assert course['id']==language+'-course'
        assert [(s['id'],s['title'],s['order']) for s in course['sections']]==[('foundations','Foundations',1)]
        assert len(lesson_ids(language))==(14 if language=='yoruba' else 5)
        assert set(lesson_ids(language))=={lesson for lang,lesson in ANSWER_KEYS if lang==language}

def test_ordering_crosses_units_and_sections_without_limits(monkeypatch):
    monkeypatch.setitem(COURSES,'test',{'sections':[
        {'order':2,'units':[{'order':1,'lesson_ids':['last']}]},
        {'order':1,'units':[{'order':2,'lesson_ids':['middle']},{'order':1,'lesson_ids':['first','second']}]}
    ]})
    assert lesson_ids('test')==('first','second','middle','last')

def test_yoruba_daily_connections_follows_unit_three():
    units=COURSES['yoruba']['sections'][0]['units']
    assert [(u['id'],u['order']) for u in units]==[('unit-1',1),('unit-2',2),('unit-3',3),('unit-4',4),('unit-5',5)]
    assert units[-2]['title']=='Daily Connections'
    assert lesson_ids('yoruba')[8:12]==('transport-and-travel','time-and-daily-routine','shopping-and-the-market','making-requests')
    assert all(len(lesson_ids(lang))==5 for lang in ('igbo','hausa'))
