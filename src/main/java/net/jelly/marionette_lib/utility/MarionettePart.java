package net.jelly.marionette_lib.utility;

import net.jelly.marionette_lib.networking.ModMessages;
import net.jelly.marionette_lib.networking.MultipartEntityMessage;
import net.minecraft.nbt.CompoundTag;
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

/**
 * One segment of a {@link Limb}. Directly instantiable for the common case
 * (hurt/interact forward to the parent entity, as most multipart creatures want).
 * Subclass only when a segment needs custom hit/interaction behavior.
 */
public class MarionettePart<T extends Entity> extends PartEntity<T> {
    private Vec3 newPosition = null;
    private final EntityDimensions size;
    public float length;
    public Vec3 direction = new Vec3(0, 1, 0);

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
