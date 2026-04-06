from src.apps.comic_gen.models import GenerationStatus, Scene, Script, StoryboardFrame
from src.apps.comic_gen.pipeline import ComicGenPipeline


def test_expand_frame_description_updates_frame_and_returns_payload():
    pipeline = ComicGenPipeline.__new__(ComicGenPipeline)
    pipeline.scripts = {
        "script-1": Script(
            id="script-1",
            title="Test",
            original_text="",
            created_at=0,
            updated_at=0,
            characters=[],
            scenes=[Scene(id="scene-1", name="Room", description="A small room", status=GenerationStatus.PENDING)],
            props=[],
            frames=[
                StoryboardFrame(
                    id="frame-1",
                    scene_id="scene-1",
                    action_description="A walks in.",
                )
            ],
        )
    }
    pipeline._save_data = lambda: None

    class StubProcessor:
        def expand_frame_description(self, frame_context: str, instruction: str = ""):
            assert "Current Action / Visuals: A walks in." in frame_context
            assert instruction == "强调压迫感和停顿"
            return {"action_description": "A pushes the door open and steps into the cramped room, pausing briefly."}

    pipeline.script_processor = StubProcessor()

    result = pipeline.expand_frame_description("script-1", "frame-1", instruction="强调压迫感和停顿")

    assert result["frame_updated"] is True
    assert result["action_description"].startswith("A pushes the door open")
    assert pipeline.scripts["script-1"].frames[0].action_description == result["action_description"]
