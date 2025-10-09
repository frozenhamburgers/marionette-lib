package net.jelly.marionette_lib.utility;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

/**
 * Deprecated
 */
public abstract class AbstractMultipartEntity extends Entity {
    protected final AbstractPartEntity[] allParts;
    protected Vec3 fabrikTarget = new Vec3(0,0,0);

    /**
     * Initialize allParts in constructor
     */
    public AbstractMultipartEntity(EntityType entityType, Level level) {
        super(entityType, level);
        this.allParts = new AbstractPartEntity[]{};
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public @Nullable PartEntity<?>[] getParts() {
        return allParts;
    }

    public void remove(RemovalReason removalReason) {
        super.remove(removalReason);
        if (allParts != null) {
            for (PartEntity part : allParts) {
                part.remove(RemovalReason.KILLED);
            }
        }
    }

    public void tick() {
        super.tick();
        this.tickMultipart();
    }


    public void fabrikForward(Vec3 target) {
        for (int i = allParts.length - 1; i >= 0; i--) {
            AbstractPartEntity currentSegment = allParts[i];
            Vec3 lastEndPos;
            Vec3 nextRootPos;
            Vec3 root = this.position();
            if (i == 0) {
                lastEndPos = root;
            } else {
                AbstractPartEntity lastSegment = allParts[i-1];
                lastEndPos = lastSegment.getEndPos();
            }

            if (i == allParts.length - 1) {
                nextRootPos = target;
            }
            else {
                AbstractPartEntity nextSegment = allParts[i+1];
                nextRootPos = nextSegment.getRootPos();
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
            Vec3 root = this.position();
            if (i == 0) {
                lastEndPos = root;
            } else {
                AbstractPartEntity lastSegment = allParts[i-1];
                lastEndPos = lastSegment.getEndPos();
            }

            if (i == allParts.length - 1) {
                nextRootPos = target;
            }
            else {
                AbstractPartEntity nextSegment = allParts[i+1];
                nextRootPos = nextSegment.getRootPos();
            }

            currentSegment.setPartDirection(nextRootPos.subtract(lastEndPos));
            currentSegment.setRootPos(lastEndPos);
        }
    }

    private void tickMultipart() {
        // if not possible to reach target
        float totalLength = 0;
        float distToTarget = (float) (fabrikTarget.subtract(position()).length());
        for (int i = 0; i < allParts.length; i++) totalLength += allParts[i].getLength();
        if (distToTarget >= totalLength) {
            System.out.println("target too far, reaching");
            Vec3 rootToTarget = fabrikTarget.subtract(position()).normalize();
            for (int i = 0; i < allParts.length; i++) {
                AbstractPartEntity currentSegment = allParts[i];
                Vec3 lastEndPos;
                Vec3 root = this.position();
                if (i == 0) lastEndPos = root;
                else {
                    lastEndPos = allParts[i-1].getEndPos();
                }

                currentSegment.setPartDirection(rootToTarget);
                currentSegment.setRootPos(lastEndPos);
                System.out.println("segment " + i + ": " + lastEndPos);
            }
        }
        else {
            // if possible to reach target
            // while head segment is not within tolerance range of target
            float tolerance = 0.01f;
            int fiterations = 0;
            while (Math.abs(fabrikTarget.subtract(allParts[allParts.length - 1].getEndPos()).length()) > tolerance && fiterations <= 10) {
                fabrikForward(fabrikTarget);
                fabrikBackward(fabrikTarget);
                fiterations++;
            }
        }

        for (int i = 0; i < allParts.length; i++) allParts[i].tick();

    }

}
