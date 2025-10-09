package net.jelly.abyss_mod.utility;

import java.util.ArrayList;

public interface ProceduralAnimatable {
    ArrayList<FabrikAnimator> getAnimators();

    default void tickMultipart() {
        getAnimators().forEach(animator -> animator.tickMultipart());
    }
}
