package net.jelly.abyss_mod.utility;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;

/**
 * Animates multipart entity with FABRIK
 */
public class FabrikAnimator {
    private final Entity owner;
    private final AbstractPartEntity[] allParts;
    private Vec3 fabrikTarget = Vec3.ZERO;
    private boolean followRootOnly = false;

    public FabrikAnimator(Entity owner, AbstractPartEntity[] allParts) {
        this.owner = owner;
        this.allParts = allParts;
    }

    public Vec3 getFabrikTarget() {
        return fabrikTarget;
    }

    public void setFabrikTarget(Vec3 fabrikTarget) {
        this.fabrikTarget = fabrikTarget;
    }

    public void fabrikForward(Vec3 target) {
        for (int i = allParts.length - 1; i >= 0; i--) {
            AbstractPartEntity currentSegment = allParts[i];
            Vec3 lastEndPos;
            Vec3 nextRootPos;
            Vec3 root = owner.position();

            if (i == 0) {
                lastEndPos = root;
            } else {
                lastEndPos = allParts[i - 1].getEndPos();
            }

            if (i == allParts.length - 1) {
                nextRootPos = target;
            } else {
                nextRootPos = allParts[i + 1].getRootPos();
            }

            currentSegment.setPartDirection(nextRootPos.subtract(lastEndPos));
            currentSegment.setEndPos(nextRootPos);
        }
    }

    public void fabrikBackward(Vec3 target) {
        for (int i = 0; i < allParts.length; i++) {
            AbstractPartEntity currentSegment = allParts[i];
            Vec3 lastEndPos;
            Vec3 nextRootPos;
            Vec3 root = owner.position();

            if (i == 0) {
                lastEndPos = root;
            } else {
                lastEndPos = allParts[i - 1].getEndPos();
            }

            if (i == allParts.length - 1) {
                if(!followRootOnly) nextRootPos = target;
                else nextRootPos = currentSegment.getEndPos();
            } else {
                nextRootPos = allParts[i + 1].getRootPos();
            }

            currentSegment.setPartDirection(nextRootPos.subtract(lastEndPos));
            currentSegment.setRootPos(lastEndPos);
        }
    }

    public void tickMultipart() {
        // total chain length
        float totalLength = 0;
        float distToTarget = (float) (fabrikTarget.subtract(owner.position()).length());
        for (AbstractPartEntity part : allParts) totalLength += part.getLength();

        if (distToTarget >= totalLength && !followRootOnly) {
            // target too far: fully extend
            Vec3 rootToTarget = fabrikTarget.subtract(owner.position()).normalize();
            for (int i = 0; i < allParts.length; i++) {
                AbstractPartEntity currentSegment = allParts[i];
                Vec3 lastEndPos = (i == 0) ? owner.position() : allParts[i - 1].getEndPos();

                currentSegment.setPartDirection(rootToTarget);
                currentSegment.setRootPos(lastEndPos);
            }
        } else {
            // FABRIK iterations
            float tolerance = 0.01f;
            int fiterations = 0;
            while (Math.abs(fabrikTarget.subtract(allParts[allParts.length - 1].getEndPos()).length()) > tolerance && fiterations <= 10) {
                if(!followRootOnly) fabrikForward(fabrikTarget);
                fabrikBackward(fabrikTarget);
                fiterations++;
            }
        }

        for (AbstractPartEntity part : allParts) part.tick();
    }

    /**
     * Makes it so the segments only follow the root and the target has no effect.
     * Good for things like worms, snakes, tails, trailing cloths, etc.
     */
    public void setFollowRootOnly(boolean b) {
        this.followRootOnly = b;
    }
}
