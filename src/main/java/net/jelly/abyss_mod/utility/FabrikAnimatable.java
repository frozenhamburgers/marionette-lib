package net.jelly.abyss_mod.utility;

import net.minecraft.world.phys.Vec3;

public interface FabrikAnimatable {
    FabrikAnimator getAnimator();

    default void tickMultipart() {
        getAnimator().tickMultipart();
    }

    default void setFabrikTarget(Vec3 target) {
        getAnimator().setFabrikTarget(target);
    }

    default Vec3 getFabrikTarget() {
        return getAnimator().getFabrikTarget();
    }
}
