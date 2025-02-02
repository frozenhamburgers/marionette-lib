package net.jelly.abyss_mod.entity.multipart;

import net.minecraft.client.renderer.entity.EnderDragonRenderer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.ZombieAttackGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.animal.WaterAnimal;
import net.minecraft.world.entity.boss.EnderDragonPart;
import net.minecraft.world.entity.boss.enderdragon.EnderDragon;
import net.minecraft.world.entity.monster.Zombie;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.pathfinder.BlockPathTypes;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.jetbrains.annotations.Nullable;

import java.util.Arrays;

public class WormEntity extends WaterAnimal {
    public final WormPartEntity tail1Part;
    public final WormPartEntity tail2Part;
    public final WormPartEntity tail3Part;
    public final WormPartEntity tail4Part;
    public final WormPartEntity tail5Part;
    private final WormPartEntity[] allParts;
    private float fishPitch = 0;
    private float prevFishPitch = 0;
    private float fakeYRot = 0;
    private float[][] trailTransformations = new float[128][2];
    private int trailPointer = -1;
    private boolean spawnTick = true;

    public WormEntity(EntityType entityType, Level level) {
        super(entityType, level);
        tail1Part = new WormPartEntity(this, this, 1.1F, 0.5F);
        tail2Part = new WormPartEntity(this, tail1Part, 1.1F, 0.5F);
        tail3Part = new WormPartEntity(this, tail2Part, 1F, 0.5F);
        tail4Part = new WormPartEntity(this, tail3Part, 0.8F, 0.5F);
        tail5Part = new WormPartEntity(this, tail4Part, 0.6F, 0.5F);
        allParts = new WormPartEntity[]{tail1Part, tail2Part, tail3Part, tail4Part, tail5Part};
    }

    public void remove(Entity.RemovalReason removalReason) {
        super.remove(removalReason);
        if (allParts != null) {
            for (PartEntity part : allParts) {
                part.remove(RemovalReason.KILLED);
            }
        }
    }

    @Override
    public boolean isMultipartEntity() {
        return true;
    }

    @Override
    public @Nullable PartEntity<?>[] getParts() {
        return allParts;
    }

    public void tick() {
        super.tick();
        this.tickMultipart();
    }

    protected void registerGoals() {
        this.goalSelector.addGoal(0, new LookAtPlayerGoal(this, Player.class, 8.0F));
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
    }


    private void tickMultipart() {
        Vec3[] avector3d = new Vec3[this.allParts.length];
        for (int j = 0; j < this.allParts.length; ++j) {
            avector3d[j] = new Vec3(this.allParts[j].getX(), this.allParts[j].getY(), this.allParts[j].getZ());
        }

        for (int i=0; i<allParts.length; i++) {
            WormPartEntity part = allParts[i];
            float pOffsetX = 0;
            float pOffsetY = i;
            float pOffsetZ = 0;
            part.setPos(this.getX() + pOffsetX, this.getY() + pOffsetY, this.getZ() + pOffsetZ);
        }

        for (int l = 0; l < this.allParts.length; ++l) {
            this.allParts[l].xo = avector3d[l].x;
            this.allParts[l].yo = avector3d[l].y;
            this.allParts[l].zo = avector3d[l].z;
            this.allParts[l].xOld = avector3d[l].x;
            this.allParts[l].yOld = avector3d[l].y;
            this.allParts[l].zOld = avector3d[l].z;
        }
    }


    public static AttributeSupplier.Builder createAttributes() {
        return Animal.createLivingAttributes()
                .add(Attributes.MAX_HEALTH, 20D)
                .add(Attributes.FOLLOW_RANGE, 24D)
                .add(Attributes.MOVEMENT_SPEED, 0.25D)
                .add(Attributes.ARMOR_TOUGHNESS, 0.1f)
                .add(Attributes.ATTACK_KNOCKBACK, 0.5f)
                .add(Attributes.ATTACK_DAMAGE, 2f);
    }

}
