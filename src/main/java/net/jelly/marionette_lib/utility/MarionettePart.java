package net.jelly.marionette_lib.utility;

import net.jelly.marionette_lib.networking.ModMessages;
import net.jelly.marionette_lib.networking.MultipartEntityMessage;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.joml.Matrix3f;
import org.joml.Quaternionf;
import org.joml.Vector3f;

/**
 * One segment of a {@link Limb}. Directly instantiable for the common case
 * (hurt/interact forward to the parent entity, as most multipart creatures want).
 * Subclass only when a segment needs custom hit/interaction behavior.
 */
public class MarionettePart<T extends Entity> extends PartEntity<T> {
    private static final Vec3 DEFAULT_UP = new Vec3(0, 1, 0);

    private Vec3 newPosition = null;
    private final EntityDimensions size;
    public float length;
    public Vec3 direction = new Vec3(0, 1, 0);
    private Vec3 up = DEFAULT_UP;

    public MarionettePart(T parent, float sizeXZ, float sizeY, float length) {
        super(parent);
        this.blocksBuilding = true;
        this.size = EntityDimensions.fixed(sizeXZ, sizeY);
        this.length = length;
        this.refreshDimensions();
    }

    public void setPartPos(Vec3 pos) {
        setPartPos(pos.x, pos.y, pos.z);
    }

    public void setPartPos(double x, double y, double z) {
        newPosition = new Vec3(x, y, z);
    }

    @Override
    public Vec3 position() {
        if (newPosition != null) return newPosition;
        else return super.position();
    }

    /** Call after finalizing positions for the tick. */
    public void tick() {
        if (newPosition != null) {
            this.xo = this.getX();
            this.yo = this.getY();
            this.zo = this.getZ();
            this.xOld = this.getX();
            this.yOld = this.getY();
            this.zOld = this.getZ();
            setPos(newPosition);
        }
        super.tick();
    }

    @Override
    public EntityDimensions getDimensions(Pose pose) {
        return size;
    }

    @Override
    public AABB getBoundingBoxForCulling() {
        return this.getBoundingBox().inflate(1.0D, 1.0D, 1.0D);
    }

    @Override
    public boolean fireImmune() {
        return true;
    }

    @Override
    public boolean hurt(DamageSource source, float amount) {
        Entity parent = this.getParent();
        if (!this.isInvulnerableTo(source) && parent != null) {
            Entity attacker = source.getEntity();
            if (attacker != null && attacker.level().isClientSide) {
                ModMessages.sendToServer(new MultipartEntityMessage(parent.getId(), attacker.getId(), 1, amount));
            }
        }
        return false;
    }

    @Override
    public InteractionResult interact(Player player, InteractionHand hand) {
        Entity parent = this.getParent();
        if (parent == null) {
            return InteractionResult.PASS;
        } else {
            if (player.level().isClientSide) {
                ModMessages.sendToServer(new MultipartEntityMessage(parent.getId(), player.getId(), 0, 0));
            }
            return parent.interact(player, hand);
        }
    }

    @Override
    public boolean is(Entity entityIn) {
        return this == entityIn || this.getParent() == entityIn;
    }

    @Override
    public boolean canBeCollidedWith() {
        Entity parent = this.getParent();
        return parent != null && parent.canBeCollidedWith();
    }

    @Override
    public boolean isPickable() {
        Entity parent = this.getParent();
        return parent != null && parent.isPickable();
    }

    @Override
    public boolean save(CompoundTag tag) {
        return false;
    }

    public boolean shouldBeSaved() {
        return false;
    }

    @Override
    protected void defineSynchedData() {
    }

    @Override
    protected void readAdditionalSaveData(CompoundTag compound) {
    }

    @Override
    protected void addAdditionalSaveData(CompoundTag compound) {
    }

    public float getLength() {
        return length;
    }

    public Vec3 getPartDirection() {
        return direction;
    }

    public void setPartDirection(Vec3 direction) {
        this.direction = direction.normalize();
    }

    /** yaw of {@link #getPartDirection()}. describes the direction, does NOT define part space, see {@link #partToWorld(Vec3)} */
    public float partYaw() {
        Vec3 dir = direction.normalize();
        return (float) Math.atan2(dir.x, dir.z);
    }

    /** pitch of {@link #getPartDirection()}. describes the direction, does NOT define part space, see {@link #partToWorld(Vec3)} */
    public float partPitch() {
        Vec3 dir = direction.normalize();
        return (float) Math.asin(Mth.clamp(dir.y, -1, 1));
    }

    /** up for this part, world space. written by {@link FabrikAnimator} every tick */
    public Vec3 getUpVector() {
        return up;
    }

    public void setUpVector(Vec3 up) {
        this.up = up == null ? DEFAULT_UP : up;
    }

    /**
     * part local to world, +Z along {@link #getPartDirection()} and +Y as near {@link #getUpVector()} as
     * that allows. single definition of part space, {@link #partToWorld(Vec3)} and
     * {@link MarionetteModel} both read it
     */
    public Quaternionf partFrame() {
        Vector3f forward = new Vector3f((float) direction.x, (float) direction.y, (float) direction.z);
        if (forward.lengthSquared() < 1.0e-8f) forward.set(0, 1, 0);
        forward.normalize();

        Vector3f sideways = upFor().cross(forward, new Vector3f());
        // up along the direction picks out no sideways. any axis off it will do, this only keeps the
        // frame finite. it snaps here, see partToWorld
        if (sideways.lengthSquared() < 1.0e-10f) {
            Vector3f fallback = Math.abs(forward.y) > 0.9f ? new Vector3f(0, 0, 1) : new Vector3f(0, 1, 0);
            sideways = fallback.cross(forward, new Vector3f());
        }
        sideways.normalize();

        Vector3f upward = forward.cross(sideways, new Vector3f());
        return new Quaternionf().setFromNormalized(new Matrix3f(sideways, upward, forward));
    }

    private Vector3f upFor() {
        Vector3f u = new Vector3f((float) up.x, (float) up.y, (float) up.z);
        if (u.lengthSquared() < 1.0e-8f) u.set(0, 1, 0);
        return u.normalize();
    }

    /**
     * part space to world, the frame {@link MarionetteModel} renders geometry in.
     * <p>
     * roll comes from {@link #getUpVector()}, so the frame is undefined where the direction runs along it
     * and an off-axis {@code local} snaps as the direction crosses. that pole cannot be removed, only
     * moved, so a limb's up SHOULD point somewhere the limb never does. axial offsets are immune
     */
    public Vec3 partToWorld(Vec3 local) {
        Vector3f v = partFrame().transform(new Vector3f((float) local.x, (float) local.y, (float) local.z));
        return new Vec3(v.x, v.y, v.z);
    }

    /** inverse of {@link #partToWorld(Vec3)} */
    public Vec3 worldToPart(Vec3 world) {
        Vector3f v = partFrame().transformInverse(new Vector3f((float) world.x, (float) world.y, (float) world.z));
        return new Vec3(v.x, v.y, v.z);
    }

    public Vec3 getRootPos() {
        return this.position().subtract(direction.scale(length / 2));
    }

    public Vec3 getEndPos() {
        return this.position().add(direction.scale(length / 2));
    }

    public void setRootPos(Vec3 root) {
        setPartPos(root.add(direction.scale(length / 2)));
    }

    public void setEndPos(Vec3 end) {
        setPartPos(end.subtract(direction.scale(length / 2)));
    }
}
