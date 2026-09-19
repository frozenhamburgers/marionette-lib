package net.jelly.marionette_lib.utility;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;

/**
 * Animates a chain of {@link MarionettePart}s with FABRIK (Forward And Backward
 * Reaching Inverse Kinematics).
 */
public class FabrikAnimator {
    private final Entity owner;
    private final MarionettePart<?>[] allParts;
    private Vec3 fabrikTarget = Vec3.ZERO;
    private boolean followRootOnly = false;
    private Vec3 root;

    public FabrikAnimator(Entity owner, MarionettePart<?>[] allParts) {
        this.owner = owner;
        this.allParts = allParts;
    }

    public Vec3 getFabrikTarget() {
        return fabrikTarget;
    }

    public void setFabrikTarget(Vec3 fabrikTarget) {
        this.fabrikTarget = fabrikTarget;
    }

    public Vec3 chainEndPos() {
        return allParts[allParts.length - 1].getEndPos();
    }

    public Vec3 chainRoot() {
        return allParts[0].getRootPos();
    }

    /** default root is the parent entity's own position */
    public void setRoot(Vec3 root) {
        this.root = root;
    }

    /** segments only follow the root, ignoring the target - for worms, tails, trailing cloth, etc. */
    public void setFollowRootOnly(boolean b) {
        this.followRootOnly = b;
    }

    protected Vec3 root() {
        if (root != null) return root;
        return owner.position();
    }

    protected void fabrikForward(Vec3 target) {
        for (int i = allParts.length - 1; i >= 0; i--) {
            MarionettePart<?> currentSegment = allParts[i];
            Vec3 lastEndPos;
            Vec3 nextRootPos;

            if (i == 0) {
                lastEndPos = root();
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

    protected void fabrikBackward(Vec3 target) {
        for (int i = 0; i < allParts.length; i++) {
            MarionettePart<?> currentSegment = allParts[i];
            Vec3 lastEndPos;
            Vec3 nextRootPos;

            if (i == 0) {
                lastEndPos = root();
            } else {
                lastEndPos = allParts[i - 1].getEndPos();
            }

            if (i == allParts.length - 1) {
                if (!followRootOnly) nextRootPos = target;
                else nextRootPos = currentSegment.getEndPos();
            } else {
                nextRootPos = allParts[i + 1].getRootPos();
            }

            currentSegment.setPartDirection(nextRootPos.subtract(lastEndPos));
            currentSegment.setRootPos(lastEndPos);
        }
    }

    /**
     * Lays the whole chain out in a straight line along {@code direction} from the current
     * {@link #root()}, discarding its previous shape. Call before {@link #tickMultipart()} to bias
     * that tick's solve. Priming after solve has no effect, since tickMultipart recomputes
     * every direction from neighboring positions again.
     * Useful for pseudo constraints with FABRIK, e.g. humanoid arms can be primed backwards so FABRIK will almost always
     * converge such that the elbow joint's rotation is < 180 degrees (not hyperrotated the wrong direction)
     */
    public void primeMultipart(Vec3 direction) {
        Vec3 dir = direction.normalize();
        Vec3 lastEndPos = root();
        for (MarionettePart<?> part : allParts) {
            part.setPartDirection(dir);
            part.setRootPos(lastEndPos);
            lastEndPos = part.getEndPos();
        }
    }

    /** same as {@link #primeMultipart(Vec3)}, but with a distinct direction per segment (index-aligned with the part array) */
    public void primeMultipart(Vec3[] directions) {
        Vec3 lastEndPos = root();
        for (int i = 0; i < allParts.length; i++) {
            Vec3 dir = directions[i].normalize();
            allParts[i].setPartDirection(dir);
            allParts[i].setRootPos(lastEndPos);
            lastEndPos = allParts[i].getEndPos();
        }
    }

    public void tickMultipart() {
        float totalLength = 0;
        float distToTarget = (float) (fabrikTarget.subtract(root()).length());
        for (MarionettePart<?> part : allParts) totalLength += part.getLength();

        if (distToTarget >= totalLength && !followRootOnly) {
            // target unreachable: fully extend toward it instead of running FABRIK
            Vec3 rootToTarget = fabrikTarget.subtract(root()).normalize();
            for (int i = 0; i < allParts.length; i++) {
                MarionettePart<?> currentSegment = allParts[i];
                Vec3 lastEndPos = (i == 0) ? root() : allParts[i - 1].getEndPos();

                currentSegment.setPartDirection(rootToTarget);
                currentSegment.setRootPos(lastEndPos);
            }
        } else {
            float tolerance = 0.01f;
            int iterations = 0;
            do { // run at least one fabrik iteration per tick, in case of manual changes.
                if (!followRootOnly) fabrikForward(fabrikTarget);
                fabrikBackward(fabrikTarget);
                iterations++;
            } while (!followRootOnly && fabrikTarget.subtract(allParts[allParts.length - 1].getEndPos()).length() > tolerance && iterations < 100);
        }

        for (MarionettePart<?> part : allParts) part.tick();
    }
}
