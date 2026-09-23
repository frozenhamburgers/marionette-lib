package net.jelly.marionette_lib.utility;

import net.minecraft.util.Mth;
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
    private MarionettePart<?> rootPart = null;
    private Vec3 rootOffset = Vec3.ZERO;
    private Vec3 primeDirection = null;
    private Vec3 bodyPrimeDirection = null;

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
        this.rootPart = null;
    }

    /**
     * Roots the chain at {@code offset} in {@code part}'s own frame, see
     * {@link MarionettePart#partToWorld(Vec3)}, re-resolved before every solve so the chain rides along
     * with the part instead of sitting at a fixed point. This is how one limb hangs off another. Clear
     * with {@link #detachRoot()}.
     * <p>
     * {@code part} has to have solved for the tick before this chain does, or the root is read a tick
     * late, which {@link Marionette#tickMarionette()} handles by ticking attached limbs last.
     */
    public void attachRoot(MarionettePart<?> part, Vec3 offset) {
        this.rootPart = part;
        this.rootOffset = offset == null ? Vec3.ZERO : offset;
        this.root = null;
    }

    public MarionettePart<?> getRootPart() {
        return rootPart;
    }

    public Vec3 getRootOffset() {
        return rootOffset;
    }

    public void detachRoot() {
        this.rootPart = null;
        this.rootOffset = Vec3.ZERO;
    }

    /** segments only follow the root, ignoring the target - for worms, tails, trailing cloth, etc. */
    public void setFollowRootOnly(boolean b) {
        this.followRootOnly = b;
    }

    /** re-primes along {@code direction} before every solve, see {@link #primeMultipart(Vec3)}. clear with {@link #clearPrimeDirection()} */
    public void setPrimeDirection(Vec3 direction) {
        this.primeDirection = direction == null ? null : direction.normalize();
        this.bodyPrimeDirection = null;
    }

    public Vec3 getPrimeDirection() {
        return primeDirection;
    }

    /**
     * Same as {@link #setPrimeDirection(Vec3)} but {@code direction} is read in the owner's own frame, +Z forward,
     * and rotated by its yaw before each solve, so the bias follows the entity around instead of pointing at a fixed
     * compass heading. This is what a direction authored in Blockbench means, since a rig there has no yaw.
     * <p>
     * Yaw only. Any other axis, e.g. pitch on a flyer, MUST be folded into the vector yourself, per tick, via
     * {@link #setPrimeDirection(Vec3)}.
     */
    public void setBodyPrimeDirection(Vec3 direction) {
        this.bodyPrimeDirection = direction == null ? null : direction.normalize();
        this.primeDirection = null;
    }

    public Vec3 getBodyPrimeDirection() {
        return bodyPrimeDirection;
    }

    public void clearPrimeDirection() {
        this.primeDirection = null;
        this.bodyPrimeDirection = null;
    }

    // -yaw matches Entity.calculateViewVector, which builds the same rotation by hand
    protected Vec3 resolvePrimeDirection() {
        if (bodyPrimeDirection != null) return bodyPrimeDirection.yRot(-owner.getYRot() * Mth.DEG_TO_RAD);
        return primeDirection;
    }

    protected Vec3 root() {
        if (rootPart != null) return rootPart.position().add(rootPart.partToWorld(rootOffset));
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
     *
     * This has mostly been replaced by the persistent primeDirection, which has BlockBench simulation compat
     * However, users still have the option to leave primeDirection null and prime manually in cases that need fine control.
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
        Vec3 prime = resolvePrimeDirection();
        if (prime != null) primeMultipart(prime);

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
