import time
import threading

from src.apps.comic_gen.models import Character, Prop, Scene, Script, Series
from src.apps.comic_gen.pipeline import ComicGenPipeline


def test_series_view_includes_episode_assets():
    now = time.time()

    series = Series(
        id="series-1",
        title="Series 1",
        description="",
        episode_ids=["ep-1"],
        created_at=now,
        updated_at=now,
    )

    episode = Script(
        id="ep-1",
        title="Episode 1",
        original_text="demo",
        series_id="series-1",
        episode_number=1,
        characters=[Character(id="char-1", name="Hero", description="Lead")],
        scenes=[Scene(id="scene-1", name="Street", description="Night street")],
        props=[Prop(id="prop-1", name="Sword", description="Silver sword")],
        created_at=now,
        updated_at=now,
    )

    pipeline = ComicGenPipeline.__new__(ComicGenPipeline)
    pipeline.series_store = {"series-1": series}
    pipeline.scripts = {"ep-1": episode}

    aggregated = pipeline.get_series_with_episode_assets("series-1")

    assert aggregated is not None
    assert [character.id for character in aggregated.characters] == ["char-1"]
    assert [scene.id for scene in aggregated.scenes] == ["scene-1"]
    assert [prop.id for prop in aggregated.props] == ["prop-1"]


def test_episode_inherits_existing_series_assets_when_added():
    now = time.time()

    series = Series(
        id="series-1",
        title="Series 1",
        description="",
        characters=[Character(id="char-1", name="Hero", description="Lead")],
        scenes=[Scene(id="scene-1", name="Street", description="Night street")],
        props=[Prop(id="prop-1", name="Sword", description="Silver sword")],
        created_at=now,
        updated_at=now,
    )

    episode = Script(
        id="ep-2",
        title="Episode 2",
        original_text="demo",
        characters=[],
        scenes=[],
        props=[],
        created_at=now,
        updated_at=now,
    )

    pipeline = ComicGenPipeline.__new__(ComicGenPipeline)
    pipeline.series_store = {"series-1": series}
    pipeline.scripts = {"ep-2": episode}
    pipeline._save_lock = threading.RLock()
    pipeline._save_data = lambda: None
    pipeline._save_series_data_unlocked = lambda: None

    pipeline.add_episode_to_series("series-1", "ep-2", 2)

    assert episode.series_id == "series-1"
    assert [character.id for character in episode.characters] == ["char-1"]
    assert [scene.id for scene in episode.scenes] == ["scene-1"]
    assert [prop.id for prop in episode.props] == ["prop-1"]
