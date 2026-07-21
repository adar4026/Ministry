// TASK_043 — shared photo/placeholder circle extracted from ProfileHeroCard.
// Covers the behavior both ProfileHeroCard and the Home header avatar rely
// on: photo vs. placeholder, broken-file fallback + onInvalidPhoto, and the
// optional Pressable wrapper used only by callers that need the circle
// itself to be the tap target.
import { act, create } from "react-test-renderer";
import { ProfileAvatar } from "../ProfileAvatar";

describe("ProfileAvatar", () => {
  it("shows the placeholder when no photo is set", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar size={40} />);
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
  });

  it("renders an Image with the given photoUri", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar photoUri="file:///photo.jpg" size={40} />);
    });
    const images = renderer.root.findAllByType("Image" as never);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toEqual({ uri: "file:///photo.jpg" });
  });

  it("falls back to the placeholder and calls onInvalidPhoto when the photo fails to load", () => {
    const onInvalidPhoto = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar photoUri="file:///missing.jpg" size={40} onInvalidPhoto={onInvalidPhoto} />);
    });
    act(() => {
      renderer.root.findAllByType("Image" as never)[0].props.onError();
    });
    expect(onInvalidPhoto).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
  });

  it("shows a fresh photo again after a previously-failed URI changes", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar photoUri="file:///missing.jpg" size={40} />);
    });
    act(() => {
      renderer.root.findAllByType("Image" as never)[0].props.onError();
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(0);
    act(() => {
      renderer.update(<ProfileAvatar photoUri="file:///new.jpg" size={40} />);
    });
    expect(renderer.root.findAllByType("Image" as never)).toHaveLength(1);
  });

  it("is not a Pressable when onPress is omitted", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar size={40} />);
    });
    expect(renderer.root.findAllByProps({ accessibilityRole: "button" })).toHaveLength(0);
  });

  it("becomes a Pressable with the given accessibilityLabel when onPress is provided", () => {
    const onPress = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ProfileAvatar size={40} onPress={onPress} accessibilityLabel="Открыть профиль" />);
    });
    const button = renderer.root.findByProps({ accessibilityRole: "button" });
    expect(button.props.accessibilityLabel).toBe("Открыть профиль");
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
