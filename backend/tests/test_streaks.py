from datetime import date, datetime, timezone
from sqlalchemy import select, func
from app.models import LearningStreak
from app.streaks import learning_day, streak_summary
from test_enrollments import enrollment_db, client_for, post
from test_learning import finish

def test_lagos_calendar_boundary():
    assert learning_day(datetime(2026,10,8,22,59,tzinfo=timezone.utc)) == date(2026,10,8)
    assert learning_day(datetime(2026,10,8,23,0,tzinfo=timezone.utc)) == date(2026,10,9)

def test_daily_activity_replay_gap_longest_and_isolation(enrollment_db,monkeypatch):
    db=enrollment_db;client,user=client_for(db,'streak@example.test');post(client,'yoruba');post(client,'igbo')
    today=[date(2026,10,8)]
    monkeypatch.setattr('app.learning.learning_day', lambda:today[0])
    monkeypatch.setattr('app.streaks.learning_day', lambda:today[0])
    assert streak_summary(db,user.id)=={'current_streak':0,'longest_streak':0}
    data=finish(client,[0,1,2,1]).json();assert data['current_streak']==data['longest_streak']==1
    original=data['completions'][0]
    assert finish(client,[0,1,2,1]).json()['current_streak']==1
    from app.config import get_settings
    result=client.post('/api/learning/igbo/a-warm-welcome/complete',json={'answers':[0,2,1,0]},headers={'Origin':get_settings().frontend_url})
    assert result.json()['current_streak']==1
    for day in [9,10]:
        today[0]=date(2026,10,day)
        assert finish(client,[0,1,2,1]).json()['current_streak']==day-7
    today[0]=date(2026,10,11)
    assert client.get('/api/auth/me').json()['progress']['current_streak']==3
    today[0]=date(2026,10,12)
    read=client.get('/api/auth/me').json()['progress'];assert read['current_streak']==0 and read['longest_streak']==3
    saved=finish(client,[0,1,2,1]).json();assert saved['current_streak']==1 and saved['longest_streak']==3
    assert saved['total_xp']==20
    assert [r for r in saved['completions'] if r['language']=='yoruba']==[original]
    assert db.scalar(select(func.count()).select_from(LearningStreak))==1
    other,_=client_for(db,'otherstreak@example.test');post(other,'yoruba')
    assert other.get('/api/auth/me').json()['progress']['current_streak']==0
    assert finish(other,[0,1,2,1]).json()['current_streak']==1
    assert client.get('/api/auth/me').json()['progress']['longest_streak']==3

def test_failed_completion_does_not_count_activity(enrollment_db):
    db=enrollment_db;client,_=client_for(db,'failedstreak@example.test')
    assert finish(client,[0,1,2,1]).status_code==409
    post(client,'yoruba')
    assert finish(client,[0]).status_code==422
    assert db.scalar(select(func.count()).select_from(LearningStreak))==0
